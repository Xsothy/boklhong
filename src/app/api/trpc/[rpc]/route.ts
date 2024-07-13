import * as RPC from "@/rpc/server"
import { appRouter } from "@/server/api";

export const GET = RPC.make(appRouter);
