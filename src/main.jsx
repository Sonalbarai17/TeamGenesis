import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

/* =========================================================
   FAULT DATABASE
========================================================= */

const FAULTS = {
  BNC: {
    title: "BNC Disconnected",
    icon: "🔌",
    hints: [
      "Check the signal connection.",
      "The oscilloscope is not receiving the generator output.",
      "Reconnect the BNC cable between Generator OUTPUT and CRO CH1.",
    ],
  },

  GENERATOR: {
    title: "Generator OFF",
    icon: "⚡",
    hints: [
      "Check the signal source.",
      "The function generator output is currently disabled.",
      "Turn ON the generator output.",
    ],
  },

  TRIGGER: {
    title: "Wrong Trigger Source",
    icon: "🎯",
    hints: [
      "Check the trigger configuration.",
      "The trigger source should match the active channel.",
      "Set Trigger Source to the active channel.",
    ],
  },

  GROUND: {
    title: "Ground Coupling",
    icon: "⏚",
    hints: [
      "Check the channel coupling.",
      "The channel is currently connected to ground.",
      "Change Coupling from GND to DC or AC.",
    ],
  },

  TIME: {
    title: "Wrong Time/Div",
    icon: "⏱",
    hints: [
      "Check the horizontal scale.",
      "The current Time/Div is unsuitable for this signal.",
      "Choose a smaller Time/Div value.",
    ],
  },
};

/* =========================================================
   WAVEFORM ENGINE
========================================================= */

function waveformValue(waveform, phase) {
  const cycle = ((phase % 1) + 1) % 1;

  if (waveform === "Sine") {
    return Math.sin(cycle * Math.PI * 2);
  }

  if (waveform === "Square") {
    return cycle < 0.5 ? 1 : -1;
  }

  if (waveform === "Triangle") {
    return 1 - 4 * Math.abs(Math.round(cycle) - cycle);
  }

  return 0;
}

/* =========================================================
   KNOB
========================================================= */

function Knob({ label, value, unit, onClick }) {
  return (
    <button className="knob-control" onClick={onClick}>
      <div className="knob">
        <div className="knob-marker" />
      </div>

      <span>{label}</span>

      <strong>
        {value} {unit}
      </strong>
    </button>
  );
}

/* =========================================================
   REAL-TIME OSCILLOSCOPE DISPLAY
========================================================= */

function ScopeDisplay({
  waveform,
  frequency,
  amplitude,
  timeDiv,
  voltsDiv,
  visible,
  channel,
  coupling,
  trigger,
}) {
  const [phaseOffset, setPhaseOffset] = React.useState(0);

  /*
    Real-time animation engine.
    requestAnimationFrame gives smooth browser animation.
  */
  React.useEffect(() => {
    if (!visible) return;

    let animationFrame;
    let lastTime = performance.now();

    const animate = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setPhaseOffset((previous) => {
        let next = previous + frequency * dt;

        /*
          Prevent phase number from growing forever.
        */
        if (next > 1000000) {
          next %= 1;
        }

        return next;
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [visible, frequency]);

  /*
    Generate waveform points.
  */
  const points = React.useMemo(() => {
    const width = 1000;
    const height = 360;

    const result = [];

    /*
      10 horizontal divisions.
      timeDiv is milliseconds/div.
    */
    const totalTime = (timeDiv * 10) / 1000;

    /*
      amplitude is Vpp.
      Peak voltage = Vpp / 2.
    */
    const peakVoltage = amplitude / 2;

    /*
      8 vertical divisions.
    */
    const pixelsPerVolt = height / (8 * voltsDiv);

    const center = height / 2;

    for (let x = 0; x <= width; x++) {
      const localTime = (x / width) * totalTime;

      const phase =
        localTime * frequency + phaseOffset;

      const normalized = waveformValue(
        waveform,
        phase
      );

      const voltage =
        normalized * peakVoltage;

      let y =
        center -
        voltage * pixelsPerVolt;

      /*
        Keep waveform inside screen.
      */
      y = Math.max(
        5,
        Math.min(height - 5, y)
      );

      result.push(
        `${x},${y.toFixed(2)}`
      );
    }

    return result.join(" ");
  }, [
    waveform,
    frequency,
    amplitude,
    timeDiv,
    voltsDiv,
    phaseOffset,
  ]);

  /*
    Number of waveform cycles visible.
  */
  const cycles =
    (frequency * timeDiv * 10) / 1000;

  return (
    <div className="scope-display">

      {/* HUD */}
      <div className="scope-hud">
        <span>{channel}</span>
        <span>{coupling}</span>
        <span>{voltsDiv} V/DIV</span>
        <span>{timeDiv} ms/DIV</span>
        <span>TRIG:{trigger}</span>
      </div>

      {/* GRID */}
      <div className="scope-grid">

        {/* 11 vertical lines = 10 divisions */}
        {Array.from({ length: 11 }).map((_, i) => (
          <div
            key={`v-${i}`}
            className={`grid-v ${
              i === 5 ? "grid-center" : ""
            }`}
            style={{
              left: `${(i / 10) * 100}%`,
            }}
          />
        ))}

        {/* 9 horizontal lines = 8 divisions */}
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={`h-${i}`}
            className={`grid-h ${
              i === 4 ? "grid-center" : ""
            }`}
            style={{
              top: `${(i / 8) * 100}%`,
            }}
          />
        ))}

        {/* WAVEFORM */}
        {visible ? (
          <svg
            className="scope-wave-svg"
            viewBox="0 0 1000 360"
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="waveGlow">
                <feGaussianBlur
                  stdDeviation="3"
                  result="blur"
                />

                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Glow */}
            <polyline
              points={points}
              fill="none"
              stroke="rgba(99,255,154,0.25)"
              strokeWidth="8"
              filter="url(#waveGlow)"
            />

            {/* Main trace */}
            <polyline
              points={points}
              fill="none"
              stroke="#63ff9a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <div className="no-signal">
            <span>NO SIGNAL</span>

            <small>
              Check generator, BNC and coupling
            </small>
          </div>
        )}

        {/* Trigger marker */}
        <div className="trigger-marker">
          ▶
        </div>

        {/* Screen information */}
        <div className="screen-info">
          <span>
            {frequency.toLocaleString()} Hz
          </span>

          <span>
            {cycles.toFixed(2)} cycles / screen
          </span>
        </div>
      </div>

      {/* Bottom information */}
      <div className="scope-bottom">
        <span>{channel}</span>

        <span>
          Vpp: {amplitude.toFixed(2)} V
        </span>

        <span>
          Frequency: {frequency.toLocaleString()} Hz
        </span>

        <span className="triggered">
          ● TRIGGERED
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN APP
========================================================= */

function App() {
  /* -------------------------
     Generator
  ------------------------- */

  const [generatorOn, setGeneratorOn] =
    useState(true);

  /* -------------------------
     BNC
  ------------------------- */

  const [bncConnected, setBncConnected] =
    useState(true);

  /* -------------------------
     CRO
  ------------------------- */

  const [channel, setChannel] =
    useState("CH1");

  const [trigger, setTrigger] =
    useState("CH1");

  const [coupling, setCoupling] =
    useState("DC");

  /* -------------------------
     Scope controls
  ------------------------- */

  const [timeDiv, setTimeDiv] =
    useState(1);

  const [voltsDiv, setVoltsDiv] =
    useState(1);

  /* -------------------------
     Generator signal
  ------------------------- */

  const [frequency, setFrequency] =
    useState(1000);

  const [amplitude, setAmplitude] =
    useState(2);

  const [waveform, setWaveform] =
    useState("Sine");

  /* -------------------------
     Fault system
  ------------------------- */

  const [fault, setFault] =
    useState(null);

  const [hintLevel, setHintLevel] =
    useState(0);

  /* =======================================================
     SIGNAL VISIBILITY
  ======================================================= */

  const signalVisible =
    generatorOn &&
    bncConnected &&
    coupling !== "GND";

  /* =======================================================
     ACTIVE FAULT
  ======================================================= */

  const activeFault = useMemo(() => {
    if (!fault) return false;

    if (fault === "BNC") {
      return !bncConnected;
    }

    if (fault === "GENERATOR") {
      return !generatorOn;
    }

    if (fault === "TRIGGER") {
      return trigger !== channel;
    }

    if (fault === "GROUND") {
      return coupling === "GND";
    }

    if (fault === "TIME") {
      return timeDiv === 5;
    }

    return false;
  }, [
    fault,
    bncConnected,
    generatorOn,
    trigger,
    channel,
    coupling,
    timeDiv,
  ]);

  /* =======================================================
     FAULT INJECTION
  ======================================================= */

  const injectFault = (type) => {
    setFault(type);
    setHintLevel(0);

    if (type === "BNC") {
      setBncConnected(false);
    }

    if (type === "GENERATOR") {
      setGeneratorOn(false);
    }

    if (type === "TRIGGER") {
      setTrigger(
        channel === "CH1"
          ? "CH2"
          : "CH1"
      );
    }

    if (type === "GROUND") {
      setCoupling("GND");
    }

    if (type === "TIME") {
      setTimeDiv(5);
    }
  };

  /* =======================================================
     RESET
  ======================================================= */

  const resetAll = () => {
    setFault(null);
    setHintLevel(0);

    setGeneratorOn(true);
    setBncConnected(true);

    setTrigger(channel);

    setCoupling("DC");

    setTimeDiv(1);
    setVoltsDiv(1);
  };

  /* =======================================================
     AI HINT
  ======================================================= */

  const nextHint = () => {
    setHintLevel((value) =>
      Math.min(value + 1, 3)
    );
  };

  const currentHint =
    fault && hintLevel > 0
      ? FAULTS[fault].hints[
          hintLevel - 1
        ]
      : "Run a fault experiment and ask the AI Instructor for progressive diagnostic hints.";

  /* =======================================================
     VPP
  ======================================================= */

  const vpp = amplitude;

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="app-shell">

      {/* =================================================
          TOP BAR
      ================================================= */}

      <header className="topbar">

        <div className="brand">

          <div className="brand-icon">
            ⌁
          </div>

          <div>
            <h1>
              Creator<span>Centre</span>
            </h1>

            <p>
              CREATIVE SIMULATION WORKSPACE
            </p>
          </div>
        </div>

        <div className="experiment">
          <span>EXPERIMENT</span>

          <strong>01</strong>

          <small>
            OSCILLOSCOPE BASICS
          </small>
        </div>

        <div className="live-status">
          <span className="status-dot" />

          SIMULATION LIVE
        </div>
      </header>

      {/* =================================================
          MAIN WORKSPACE
      ================================================= */}

      <main className="workspace">

        {/* =================================================
            LEFT EQUIPMENT COLUMN
        ================================================= */}

        <section className="equipment-column">

          {/* =================================================
              OSCILLOSCOPE
          ================================================= */}

          <div className="instrument oscilloscope">

            <div className="instrument-top">

              <div>
                <span className="eyebrow">
                  DIGITAL STORAGE
                </span>

                <h2>
                  OSCILLOSCOPE
                </h2>
              </div>

              <div className="instrument-meta">
                <span>
                  DSO-2040
                </span>

                <span className="green-text">
                  ● READY
                </span>
              </div>

            </div>

            {/* REAL-TIME SCOPE */}

            <ScopeDisplay
              waveform={waveform}
              frequency={frequency}
              amplitude={amplitude}
              timeDiv={timeDiv}
              voltsDiv={voltsDiv}
              visible={signalVisible}
              channel={channel}
              coupling={coupling}
              trigger={trigger}
            />

            {/* =================================================
                SCOPE CONTROLS
            ================================================= */}

            <div className="scope-controls">

              {/* VERTICAL */}

              <div className="control-group">

                <span className="control-title">
                  VERTICAL
                </span>

                <Knob
                  label="VOLTS/DIV"
                  value={voltsDiv}
                  unit="V"
                  onClick={() => {
                    const values = [
                      0.5,
                      1,
                      2,
                      5,
                    ];

                    const index =
                      values.indexOf(
                        voltsDiv
                      );

                    setVoltsDiv(
                      values[
                        (index + 1) %
                          values.length
                      ]
                    );
                  }}
                />

                <Knob
                  label="POSITION"
                  value="0"
                  unit="DIV"
                  onClick={() => {}}
                />

              </div>

              {/* HORIZONTAL */}

              <div className="control-group">

                <span className="control-title">
                  HORIZONTAL
                </span>

                <Knob
                  label="TIME/DIV"
                  value={timeDiv}
                  unit="ms"
                  onClick={() => {
                    const values = [
                      0.5,
                      1,
                      2,
                      5,
                    ];

                    const index =
                      values.indexOf(
                        timeDiv
                      );

                    setTimeDiv(
                      values[
                        (index + 1) %
                          values.length
                      ]
                    );
                  }}
                />

                <Knob
                  label="POSITION"
                  value="0"
                  unit="DIV"
                  onClick={() => {}}
                />

              </div>

              {/* TRIGGER */}

              <div className="control-group">

                <span className="control-title">
                  TRIGGER
                </span>

                <div className="selector-block">

                  <span>
                    SOURCE
                  </span>

                  <button
                    className={
                      trigger === "CH1"
                        ? "active-selector"
                        : ""
                    }
                    onClick={() =>
                      setTrigger("CH1")
                    }
                  >
                    CH1
                  </button>

                  <button
                    className={
                      trigger === "CH2"
                        ? "active-selector"
                        : ""
                    }
                    onClick={() =>
                      setTrigger("CH2")
                    }
                  >
                    CH2
                  </button>

                </div>

                <div className="trigger-led">

                  <span className="led-green" />

                  AUTO

                </div>

              </div>

            </div>
          </div>

          {/* =================================================
              LOWER EQUIPMENT
          ================================================= */}

          <div className="lower-equipment">

            {/* =================================================
                FUNCTION GENERATOR
            ================================================= */}

            <div className="instrument generator">

              <div className="instrument-top">

                <div>

                  <span className="eyebrow">
                    SIGNAL SOURCE
                  </span>

                  <h2>
                    FUNCTION GENERATOR
                  </h2>

                </div>

                <div
                  className={
                    generatorOn
                      ? "power-led on"
                      : "power-led"
                  }
                >
                  ●
                </div>

              </div>

              {/* Generator display */}

              <div className="generator-screen">

                <div>

                  <small>
                    FREQUENCY
                  </small>

                  <strong>
                    {frequency.toLocaleString()}
                  </strong>

                  <span>
                    Hz
                  </span>

                </div>

                <div>

                  <small>
                    AMPLITUDE
                  </small>

                  <strong>
                    {amplitude.toFixed(1)}
                  </strong>

                  <span>
                    Vpp
                  </span>

                </div>

                <div>

                  <small>
                    WAVE
                  </small>

                  <strong>
                    {waveform.toUpperCase()}
                  </strong>

                </div>

              </div>

              {/* Generator controls */}

              <div className="generator-controls">

                {/* OUTPUT */}

                <button
                  className={
                    generatorOn
                      ? "big-toggle on"
                      : "big-toggle"
                  }
                  onClick={() =>
                    setGeneratorOn(
                      !generatorOn
                    )
                  }
                >

                  <span>
                    OUTPUT
                  </span>

                  <strong>
                    {generatorOn
                      ? "ON"
                      : "OFF"}
                  </strong>

                </button>

                {/* WAVEFORM */}

                <label>

                  <span>
                    WAVEFORM
                  </span>

                  <select
                    value={waveform}
                    onChange={(e) =>
                      setWaveform(
                        e.target.value
                      )
                    }
                  >
                    <option>
                      Sine
                    </option>

                    <option>
                      Square
                    </option>

                    <option>
                      Triangle
                    </option>
                  </select>

                </label>

                {/* FREQUENCY */}

                <label>

                  <span>
                    FREQUENCY —{" "}
                    {frequency} Hz
                  </span>

                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="100"
                    value={frequency}
                    onChange={(e) =>
                      setFrequency(
                        Number(
                          e.target.value
                        )
                      )
                    }
                  />

                </label>

                {/* AMPLITUDE */}

                <label>

                  <span>
                    AMPLITUDE —{" "}
                    {amplitude} Vpp
                  </span>

                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={amplitude}
                    onChange={(e) =>
                      setAmplitude(
                        Number(
                          e.target.value
                        )
                      )
                    }
                  />

                </label>

              </div>
            </div>

            {/* =================================================
                BNC CONNECTION
            ================================================= */}

            <div className="connection-panel">

              <div className="connection-port">

                <span>
                  GENERATOR
                </span>

                <strong>
                  OUTPUT
                </strong>

                <div className="bnc-port">
                  ●
                </div>

              </div>

              <div className="cable-wrapper">

                <div
                  className={
                    bncConnected
                      ? "cable connected"
                      : "cable disconnected"
                  }
                />

                <button
                  className={
                    bncConnected
                      ? "connection-label connected"
                      : "connection-label disconnected"
                  }
                  onClick={() =>
                    setBncConnected(
                      !bncConnected
                    )
                  }
                >
                  {bncConnected
                    ? "● BNC CONNECTED"
                    : "× BNC DISCONNECTED"}
                </button>

              </div>

              <div className="connection-port">

                <span>
                  OSCILLOSCOPE
                </span>

                <strong>
                  {channel}
                </strong>

                <div className="bnc-port">
                  ●
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* =================================================
            RIGHT PANEL
        ================================================= */}

        <aside className="right-panel">

          {/* =================================================
              SESSION
          ================================================= */}

          <div className="side-card session-card">

            <div className="card-heading">

              <div>

                <span className="eyebrow">
                  LAB SESSION
                </span>

                <h3>
                  Experiment Setup
                </h3>

              </div>

              <span className="session-badge">
                ACTIVE
              </span>

            </div>

            <div className="setup-grid">

              {/* CHANNEL */}

              <div>

                <span>
                  CHANNEL
                </span>

                <select
                  value={channel}
                  onChange={(e) => {
                    setChannel(
                      e.target.value
                    );

                    setTrigger(
                      e.target.value
                    );
                  }}
                >

                  <option>
                    CH1
                  </option>

                  <option>
                    CH2
                  </option>

                </select>

              </div>

              {/* COUPLING */}

              <div>

                <span>
                  COUPLING
                </span>

                <select
                  value={coupling}
                  onChange={(e) =>
                    setCoupling(
                      e.target.value
                    )
                  }
                >

                  <option>
                    DC
                  </option>

                  <option>
                    AC
                  </option>

                  <option>
                    GND
                  </option>

                </select>

              </div>

            </div>
          </div>

          {/* =================================================
              AI INSTRUCTOR
          ================================================= */}

          <div className="side-card ai-card">

            <div className="ai-header">

              <div className="ai-avatar">
                ✦
              </div>

              <div>

                <span className="eyebrow">
                  INTELLIGENT ASSISTANT
                </span>

                <h3>
                  AI Instructor
                </h3>

              </div>

              <span className="ai-live">
                ● AI
              </span>

            </div>

            <div className="diagnosis-box">

              <span>
                DIAGNOSTIC STATUS
              </span>

              <strong>

                {fault && activeFault
                  ? `${FAULTS[fault].icon} ${FAULTS[fault].title}`
                  : fault
                  ? "✓ FAULT RESOLVED"
                  : "✓ SYSTEM NORMAL"}

              </strong>

            </div>

            <div className="ai-message">

              <span className="message-label">
                INSTRUCTOR
              </span>

              <p>
                {currentHint}
              </p>

            </div>

            {/* Get hint */}

            {fault && activeFault && (
              <button
                className="hint-button"
                onClick={nextHint}
              >

                <span>
                  ✦
                </span>

                {hintLevel === 0
                  ? "GET FIRST HINT"
                  : `NEXT HINT ${hintLevel}/3`}

              </button>
            )}

            {/* Resolved */}

            {fault && !activeFault && (
              <div className="resolved">

                <span>
                  ✓
                </span>

                Fault successfully resolved

              </div>
            )}

          </div>

          {/* =================================================
              FAULT INJECTION
          ================================================= */}

          <div className="side-card fault-card">

            <div className="card-heading">

              <div>

                <span className="eyebrow">
                  DIAGNOSTIC TRAINING
                </span>

                <h3>
                  Fault Injection Lab
                </h3>

              </div>

              <span className="warning-icon">
                !
              </span>

            </div>

            <p className="fault-description">
              Inject a realistic fault and diagnose
              the oscilloscope setup using the AI
              Instructor.
            </p>

            <div className="fault-grid">

              {Object.entries(FAULTS).map(
                ([key, item]) => (
                  <button
                    key={key}
                    className={
                      fault === key
                        ? "fault active"
                        : "fault"
                    }
                    onClick={() =>
                      injectFault(key)
                    }
                  >

                    <span>
                      {item.icon}
                    </span>

                    <small>
                      {item.title}
                    </small>

                  </button>
                )
              )}

            </div>

            <button
              className="reset-button"
              onClick={resetAll}
            >
              ↻ RESET EXPERIMENT
            </button>

          </div>

          {/* =================================================
              SYSTEM STATUS
          ================================================= */}

          <div className="side-card status-card">

            <div className="card-heading">

              <div>

                <span className="eyebrow">
                  LIVE MONITOR
                </span>

                <h3>
                  System Status
                </h3>

              </div>

            </div>

            <div className="status-list">

              <div>

                <span>
                  Generator Output
                </span>

                <strong
                  className={
                    generatorOn
                      ? "good"
                      : "bad"
                  }
                >
                  {generatorOn
                    ? "ONLINE"
                    : "OFFLINE"}
                </strong>

              </div>

              <div>

                <span>
                  BNC Connection
                </span>

                <strong
                  className={
                    bncConnected
                      ? "good"
                      : "bad"
                  }
                >
                  {bncConnected
                    ? "CONNECTED"
                    : "OPEN"}
                </strong>

              </div>

              <div>

                <span>
                  Active Channel
                </span>

                <strong>
                  {channel}
                </strong>

              </div>

              <div>

                <span>
                  Trigger Source
                </span>

                <strong>
                  {trigger}
                </strong>

              </div>

              <div>

                <span>
                  Coupling
                </span>

                <strong>
                  {coupling}
                </strong>

              </div>

            </div>
          </div>

        </aside>
      </main>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="footer">

        <div>
          <strong>
            CreatorCentre
          </strong>

          <span>
            Creative Simulation Workspace
          </span>
        </div>

        <div>
          <span>
            SIMULATION ENGINE
          </span>

          <strong>
            ONLINE
          </strong>
        </div>

        <div>
          <span>
            AI DIAGNOSTICS
          </span>

          <strong>
            ENABLED
          </strong>
        </div>

        <div>
          <span>
            BUILD
          </span>

          <strong>
            V2.0
          </strong>
        </div>

      </footer>

    </div>
  );
}

/* =========================================================
   REACT ROOT
========================================================= */

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);