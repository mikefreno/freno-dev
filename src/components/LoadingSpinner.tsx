import { Spinner } from "~/components/Spinner";

export default function LoadingSpinner(props: {
  height: number;
  width: number;
}) {
  return (
    <div class="flex w-full justify-center">
      <Spinner size={props.height} />
    </div>
  );
}
