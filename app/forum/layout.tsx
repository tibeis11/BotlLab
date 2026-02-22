import Header from "@/app/components/Header";
import ForumSearch from "./_components/ForumSearch";

export default function ForumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const forumSearchSlot = (
    <div className="relative w-full max-w-sm lg:max-w-md">
      <ForumSearch />
    </div>
  );

  const forumMobileActions = <ForumSearch compact />;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30">
      <Header forumSearchSlot={forumSearchSlot} forumMobileActions={forumMobileActions} />
      <div className="w-full pt-0 pb-20">
        {children}
      </div>
    </div>
  );
}
