import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import {
  flow,
  identity,
  pipe,
} from 'fp-ts/lib/function';
import { CharacteristicValue, Service } from 'homebridge';
import * as mapper from '../mapper/lock-mapper';
import BaseAccessory from './base-accessory';
import { LockNamespaces, LockNamespacesType, LockState } from '../domain/alexa/lock';
import { SupportedActionsType } from '../domain/alexa';

export default class LockAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = [];
  service: Service;
  namespaces = LockNamespaces;
  isExternalAccessory = false;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.LockMechanism) ||
      this.platformAcc.addService(
        this.Service.LockMechanism,
        this.device.displayName,
      );

    this.service
      .getCharacteristic(this.platform.Characteristic.LockCurrentState)
      .onGet(this.handleCurrentStateGet.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.LockTargetState)
      .onSet(this.handleTargetStateSet.bind(this));
  }

  async handleCurrentStateGet(): Promise<number> {
    const alexaNamespace: LockNamespacesType = 'Alexa.LockController';
    const alexaValueName = 'lockState';
    const determineCurrentState = flow(
      O.filterMap<LockState[], LockState>(
        A.findFirst(
          ({ name, namespace }) =>
            namespace === alexaNamespace && name === alexaValueName,
        ),
      ),
      O.map(({ value }) =>
        mapper.mapAlexaCurrentStateToHomeKit(value, this.Characteristic),
           ),
      O.tap((s) =>
        O.of(this.logWithContext('debug', `Get lock state result: ${s}`)),
           ),
    );

    return pipe(
      this.getState(determineCurrentState),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get lock state', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleTargetStateSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', `Triggered set target lock state: ${value}`);
    if (value !== 0 && value !== 1) {
      throw this.invalidValueError;
    }
    const action = mapper.mapHomeKitTargetStateToAlexaAction(value, this.Characteristic);
    return pipe(
      this.platform.alexaApi.setDeviceState(
        this.device.id,
        'lockState',
        {
          'action': 'lockAction',
          'value': 'lock'
        }
      ),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Set target lock state', e);
          throw this.serviceCommunicationError;
        },
        () => {
          this.updateCacheValue({
            value: {
              value: value === 0 ? 'UNLOCKED' : 'LOCKED'
            },
            namespace: 'Alexa.LockController',
            name: 'lockState',
          });
        },
      ),
    )();
  }

}
