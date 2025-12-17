export default function Check(props: {
  strokeWidth: number;
  height: number;
  width: number;
  class?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={props.strokeWidth}
      stroke="currentColor"
      height={props.height}
      width={props.width}
      class={props.class}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}
