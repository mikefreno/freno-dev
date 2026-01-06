import { Component, createSignal, createEffect, onCleanup } from "solid-js";

interface CountdownCircleTimerProps {
  duration: number;
  initialRemainingTime?: number;
  size: number;
  strokeWidth: number;
  colors: string;
  children: (props: { remainingTime: number }) => any;
  onComplete?: () => void;
  isPlaying?: boolean;
}

const CountdownCircleTimer: Component<CountdownCircleTimerProps> = (props) => {
  const radius = (props.size - props.strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const [remainingTime, setRemainingTime] = createSignal(
    props.initialRemainingTime ?? props.duration
  );

  const progress = () => {
    const time = remainingTime();
    if (isNaN(time) || !props.duration) return 0;
    return Math.max(0, Math.min(1, time / props.duration));
  };

  const strokeDashoffset = () => {
    const prog = progress();
    if (isNaN(prog)) return 0;
    return circumference * (1 - prog);
  };

  // If isPlaying is set, manage countdown internally
  createEffect(() => {
    if (props.isPlaying !== undefined && props.isPlaying) {
      const startTime = Date.now();
      const initialTime = props.initialRemainingTime ?? props.duration;
      setRemainingTime(initialTime);

      let animationFrameId: number;

      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const newTime = Math.max(0, initialTime - elapsed);

        setRemainingTime(newTime);

        if (newTime <= 0) {
          props.onComplete?.();
          return;
        }

        animationFrameId = requestAnimationFrame(animate);
      };

      animationFrameId = requestAnimationFrame(animate);

      onCleanup(() => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      });

      return;
    }

    // Otherwise, just sync with the prop value - parent controls the countdown
    const newTime = props.initialRemainingTime ?? props.duration;

    if (isNaN(newTime)) {
      setRemainingTime(0);
      return;
    }

    setRemainingTime(newTime);

    if (newTime <= 0) {
      props.onComplete?.();
    }
  });

  return (
    <div
      style={{
        position: "relative",
        width: `${props.size}px`,
        height: `${props.size}px`
      }}
    >
      <svg
        width={props.size}
        height={props.size}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={props.size / 2}
          cy={props.size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          stroke-width={props.strokeWidth}
        />
        <circle
          cx={props.size / 2}
          cy={props.size / 2}
          r={radius}
          fill="none"
          stroke={props.colors}
          stroke-width={props.strokeWidth}
          stroke-dasharray={`${circumference}`}
          stroke-dashoffset={`${strokeDashoffset()}`}
          stroke-linecap="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)"
        }}
      >
        {props.children({ remainingTime: remainingTime() })}
      </div>
    </div>
  );
};

export default CountdownCircleTimer;
