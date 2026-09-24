import Championship from "../championship";
import { initialCompetition } from "@/lib/competition";
export default function Admin() {
  return <Championship initial={{ data: initialCompetition, version: 1, canEdit: false }} initialView="admin" />;
}
