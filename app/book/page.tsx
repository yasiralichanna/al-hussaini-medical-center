import PublicApp from "../../modules/clinic/PublicApp";
export const metadata = {
  title: "Request an appointment | Al-Hussaini Medical Center",
};
export default function Page() {
  return <PublicApp initialView="book" />;
}
