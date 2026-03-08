import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
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
    <div className="min-h-screen flex flex-col bg-background text-text-primary selection:bg-success/30">
      <Header forumSearchSlot={forumSearchSlot} forumMobileActions={forumMobileActions} />
      <div className="flex-1 w-full pt-0 pb-20">
        {children}
      </div>
      <Footer />
    </div>
  );
}
