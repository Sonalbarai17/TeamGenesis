import { FaultType } from "./FaultType";

export const FaultDatabase = {
  [FaultType.BNC_DISCONNECTED]: {
    title: "BNC Disconnected",
    description: "The signal cable is not connected properly.",
  },

  [FaultType.GENERATOR_OFF]: {
    title: "Function Generator OFF",
    description: "The function generator is not producing a signal.",
  },

  [FaultType.WRONG_TRIGGER_SOURCE]: {
    title: "Wrong Trigger Source",
    description: "The trigger source does not match the active channel.",
  },

  [FaultType.GROUND_COUPLING]: {
    title: "Ground Coupling",
    description: "The channel is configured in GND coupling.",
  },

  [FaultType.WRONG_TIME_DIVISION]: {
    title: "Wrong Time/Div",
    description: "The horizontal scale is unsuitable for the waveform.",
  },
};