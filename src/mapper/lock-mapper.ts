import { constant } from 'fp-ts/lib/function';
import type { Characteristic } from 'homebridge';
import { match } from 'ts-pattern';
import { CapabilityState } from '../domain/alexa';

export const mapAlexaCurrentStateToHomeKit = (
  value: CapabilityState['value'],
  characteristic: typeof Characteristic,
) =>
  match(value)
    .with('LOCKED', constant(characteristic.LockCurrentState.SECURED))
    .with('UNLOCKED', constant(characteristic.LockCurrentState.UNSECURED))
    .with('JAMMED', constant(characteristic.LockCurrentState.JAMMED))
    .otherwise(constant(characteristic.LockCurrentState.UNKNOWN));

export const mapAlexaTargetStateToHomeKit = (
  value: CapabilityState['value'],
  characteristic: typeof Characteristic,
) =>
  match(value)
    .with('LOCKED', constant(characteristic.LockTargetState.SECURED))
    .with('UNLOCKED', constant(characteristic.LockTargetState.UNSECURED))
    .otherwise(constant(characteristic.LockCurrentState.UNKNOWN));

export const mapHomeKitTargetStateToAlexaAction = (
  value: 0 | 1,
  characteristic: typeof Characteristic,
): 'lock' | 'unlock' =>
  match<0 | 1, 'lock' | 'unlock'>(value)
    .with(characteristic.LockTargetState.SECURED, constant('lock'))
    .with(characteristic.LockTargetState.UNSECURED, constant('unlock'))
    .exhaustive();
