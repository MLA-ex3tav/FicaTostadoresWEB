import AceptarInvitacionPanel from "@/components/admin/AceptarInvitacionPanel";

export const metadata = {
  title: "Aceptar invitación | Fica Tostadores",
  robots: { index: false, follow: false },
};

interface InvitarPageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitarPage({ params }: InvitarPageProps) {
  const { token } = await params;

  return <AceptarInvitacionPanel token={token} />;
}
