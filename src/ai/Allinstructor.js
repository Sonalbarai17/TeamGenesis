import { FaultType } from "../faults/FaultType";

export function getHint(fault, level = 1) {
  const hints = {
    [FaultType.BNC_DISCONNECTED]: [
      "Check the signal connection.",
      "Check whether the BNC probe is connected to the CRO.",
      "Connect the BNC probe properly to the input channel.",
    ],

    [FaultType.GENERATOR_OFF]: [
      "Check the function generator.",
      "The signal source may not be powered.",
      "Turn ON the function generator.",
    ],

    [FaultType.WRONG_TRIGGER_SOURCE]: [
      "The waveform may be unstable. Check triggering.",
      "The trigger source should match the active channel.",
      "Set Trigger Source to the active channel.",
    ],

    [FaultType.GROUND_COUPLING]: [
      "Check the channel coupling.",
      "The input may be set to ground coupling.",
      "Change Coupling from GND to AC or DC.",
    ],

    [FaultType.WRONG_TIME_DIVISION]: [
      "Check the horizontal scale.",
      "The Time/Div setting may not be suitable.",
      "Adjust Time/Div to display a measurable waveform.",
    ],
  };

  if (fault === FaultType.NONE) {
    return "No fault detected.";
  }

  return hints[fault]?.[Math.min(level - 1, 2)] ||
    "Check the oscilloscope settings.";
}