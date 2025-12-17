import DeletionForm from "~/components/DeletionForm";

export default function LifeAndLinageDeletionForm() {
  return (
    <div class="pt-20">
      <div class="mx-auto p-4 md:p-6 lg:p-12">
        <div class="w-full justify-center text-text">
          <div class="text-xl">
            <em>What will happen</em>:
          </div>
          Once you send, if a match to the email provided is found in our
          system, a 24hr grace period is started where you can request a
          cancellation of the account deletion. Once the grace period ends, the
          account's entry in our central database will be completely removed,
          and your individual database storing your remote saves will also be
          deleted. No data related to the account is retained in any way.
        </div>

        <DeletionForm />
      </div>
    </div>
  );
}
