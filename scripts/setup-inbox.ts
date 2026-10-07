// Creates (or returns, since client_id makes it idempotent) the Second Look inbox.
// Run: bun scripts/setup-inbox.ts
import { Agentboxd } from "agentboxd";

const mr = new Agentboxd();
const inbox = await mr.inboxes.create({
  client_id: "second-look-inbox",
  username: "secondlook",
  display_name: "Second Look",
});
console.log(JSON.stringify({ id: inbox.id, address: inbox.address }, null, 2));
