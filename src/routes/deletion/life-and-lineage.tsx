import { Title, Meta } from "@solidjs/meta";
import DeletionForm from "~/components/DeletionForm";

export default function LifeAndLinageDeletionForm() {
  return (
    <>
      <Title>Account Deletion - Life and Lineage | Michael Freno</Title>
      <Meta
        name="description"
        content="Request account deletion for Life and Lineage. Remove all your data from our system with a 24-hour grace period."
      />
      <div class="pt-20">
        <div class="mx-auto p-4 md:p-6 lg:p-12">
          <div class="text-text w-full justify-center">
            <div class="text-xl">
              <em>What will happen</em>:
            </div>
            Once you send, if a match to the email provided is found in our
            system, a 24hr grace period is started where you can request a
            cancellation of the account deletion. Once the grace period ends,
            the account's entry in our central database will be completely
            removed, and your individual database storing your remote saves will
            also be deleted. No data related to the account is retained in any
            way.
          </div>

          <DeletionForm />
        </div>
      </div>
    </>
  );
}
