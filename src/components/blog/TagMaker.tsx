import { For } from "solid-js";
import InfoIcon from "~/components/icons/InfoIcon";
import Xmark from "~/components/icons/Xmark";

export interface TagMakerProps {
  tagInputValue: string;
  tagHandler: (input: string) => void;
  tags: string[];
  deleteTag: (idx: number) => void;
}

export default function TagMaker(props: TagMakerProps) {
  return (
    <div class="flex w-full flex-col justify-center md:flex-row md:justify-between">
      <div class="absolute -mt-12 mb-8 flex w-full justify-center md:mt-0 md:mb-0 md:w-full md:justify-normal">
        <div class="tooltip md:-ml-8">
          <div class="md:mt-12">
            <InfoIcon height={24} width={24} strokeWidth={1} />
          </div>
          <div class="tooltip-text -ml-20 w-40">
            <div class="px-1">start with # end with a space</div>
          </div>
        </div>
      </div>
      <div class="py-4 md:flex md:pt-0">
        <div class="textarea-group">
          <input
            value={props.tagInputValue}
            onInput={(e) => props.tagHandler(e.currentTarget.value)}
            name="message"
            placeholder=" "
            class="underlinedInput w-full bg-transparent select-text"
          />
          <span class="bar" />
          <label class="underlinedInputLabel">Tags</label>
        </div>
      </div>
      <div class="my-auto flex max-w-[420px] flex-wrap justify-center italic md:justify-start">
        <For each={props.tags}>
          {(tag, idx) => (
            <div class="group bg-mauve relative m-1 h-fit w-fit max-w-[120px] rounded-xl px-2 py-1 text-sm">
              <div class="overflow-hidden text-base overflow-ellipsis whitespace-nowrap">
                {tag}
              </div>
              <button
                type="button"
                class="bg-mantle bg-opacity-50 absolute inset-0 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100"
                onClick={() => props.deleteTag(idx())}
              >
                <Xmark strokeWidth={1} color={"white"} height={24} width={24} />
              </button>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
