import { FaultType } from "./FaultType";

export function detectFault(state) {
  if (!state) return FaultType.NONE;

  if (!state.bncConnected) {
    return FaultType.BNC_DISCONNECTED;
  }

  if (!state.generatorOn) {
    return FaultType.GENERATOR_OFF;
  }

  if (state.coupling === "GND") {
    return FaultType.GROUND_COUPLING;
  }

  if (state.triggerSource !== state.activeChannel) {
    return FaultType.WRONG_TRIGGER_SOURCE;
  }

  if (state.timePerDiv <= 0) {
    return FaultType.WRONG_TIME_DIVISION;
  }

  return FaultType.NONE;
}