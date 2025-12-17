import { Component, createEffect, onCleanup } from "solid-js";

interface CountdownCircleTimerProps {
  duration: number;
  initialRemainingTime: number;
  size: number;
  strokeWidth: number;
  colors: string;
  children: () => any;
}

const CountdownCircleTimer: Component<CountdownCircleTimerProps> = (props) => {
  const radius = (props.size - props.strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Calculate progress (0 to 1)
  const progress = () => props.initialRemainingTime / props.duration;
  const strokeDashoffset = () => circumference * (1 - progress());

  return (
    <div
      style={{
        position: "relative",
        width: `${props.size}px`,
        height: `${props.size}px`,
      }}
    >
      <svg
        width={props.size}
        height={props.size}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Background circle */}
        <circle
          cx={props.size / 2}
          cy={props.size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          stroke-width={props.strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={props.size / 2}
          cy={props.size / 2}
          r={radius}
          fill="none"
          stroke={props.colors}
          stroke-width={props.strokeWidth}
          stroke-dasharray={circumference}
          stroke-dashoffset={strokeDashoffset()}
          stroke-linecap="round"
          style={{
            transition: "stroke-dashoffset 0.5s linear",
          }}
        />
      </svg>
      {/* Timer text in center */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        {props.children()}
      </div>
    </div>
  );
};

export default CountdownCircleTimer;
