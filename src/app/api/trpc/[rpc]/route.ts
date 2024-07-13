import * as RPC from "@/rpc/server";
import { appRouter } from "@/server/api";

const handler = RPC.make(appRouter);

export { handler as GET, handler as POST };