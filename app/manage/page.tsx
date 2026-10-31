import ManageApp from "../../modules/bookings/ManageApp";
export const metadata = {
  title: "Manage appointment | Al-Hussaini",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return <ManageApp />;
}
