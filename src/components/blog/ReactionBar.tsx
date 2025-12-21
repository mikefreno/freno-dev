import { For, Show } from "solid-js";
import type { ReactionBarProps, ReactionType } from "~/types/comment";
import TearsEmoji from "~/components/icons/emojis/Tears";
import BlankEmoji from "~/components/icons/emojis/Blank";
import TongueEmoji from "~/components/icons/emojis/Tongue";
import CryEmoji from "~/components/icons/emojis/Cry";
import HeartEyeEmoji from "~/components/icons/emojis/HeartEye";
import AngryEmoji from "~/components/icons/emojis/Angry";
import MoneyEyeEmoji from "~/components/icons/emojis/MoneyEye";
import SickEmoji from "~/components/icons/emojis/Sick";
import UpsideDownEmoji from "~/components/icons/emojis/UpsideDown";
import WorriedEmoji from "~/components/icons/emojis/Worried";

interface EmojiConfig {
  type: ReactionType;
  Component: any;
}

const EMOJI_CONFIG: EmojiConfig[] = [
  { type: "tears", Component: TearsEmoji },
  { type: "blank", Component: BlankEmoji },
  { type: "tongue", Component: TongueEmoji },
  { type: "cry", Component: CryEmoji },
  { type: "heartEye", Component: HeartEyeEmoji },
  { type: "angry", Component: AngryEmoji },
  { type: "moneyEye", Component: MoneyEyeEmoji },
  { type: "sick", Component: SickEmoji },
  { type: "upsideDown", Component: UpsideDownEmoji },
  { type: "worried", Component: WorriedEmoji }
];

export default function ReactionBar(props: ReactionBarProps) {
  const getReactionCount = (type: ReactionType) => {
    return props.reactions.filter((reaction) => reaction.type === type).length;
  };

  const hasUserReacted = (type: ReactionType) => {
    return props.reactions.some(
      (reaction) =>
        reaction.type === type && reaction.user_id === props.currentUserID
    );
  };

  const shouldShowEmoji = (type: ReactionType) => {
    return props.showingReactionOptions || getReactionCount(type) > 0;
  };

  return (
    <div
      class={`${
        props.showingReactionOptions
          ? "bg-surface0 px-2 py-4 shadow-inner brightness-90"
          : ""
      } fade-in scrollYDisabled ml-2 flex min-h-[1.5rem] w-48 max-w-[1/4] flex-row overflow-scroll rounded-md py-1 sm:w-56 md:w-fit md:overflow-hidden`}
    >
      <For each={EMOJI_CONFIG}>
        {({ type, Component }) => (
          <Show when={shouldShowEmoji(type)}>
            <div class="fade-in mx-1 flex">
              <div class={hasUserReacted(type) ? "text-green" : ""}>
                <Show when={getReactionCount(type) > 0}>
                  {getReactionCount(type)}
                </Show>
              </div>
              <button
                class="h-6 w-6 pl-0.5"
                onClick={() => props.commentReaction(type, props.commentID)}
              >
                <Component />
              </button>
            </div>
          </Show>
        )}
      </For>
    </div>
  );
}
