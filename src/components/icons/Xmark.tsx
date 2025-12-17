function Xmark(props: {
  strokeWidth: number;
  color: string;
  height: number;
  width: number;
}) {
  return (
    <div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={props.strokeWidth}
        stroke={props.color}
        height={props.height}
        width={props.width}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </div>
  );
}

export default Xmark;
