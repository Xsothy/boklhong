/**
 * @since 1.0.0
 */
import {RPCRouter, RPC, Schema, RPCResolver} from "@/lib/utils";
import { Context, pipe, Effect } from "effect";
import type { NextApiRequest, NextApiResponse} from "next";
import {NextResponse} from "next/server";

import type { RPCRouterType } from "@/type";
import {UserById, UserList} from "@/server/api/request";

export const ApiRequest = Context.Tag<NextApiRequest>("@app/ApiRequest");

export function make<R extends RPCRouterType.Router<any, any>>(router: R): (request: NextApiRequest, {params}: {
    params: { rpc: string }
}) => Promise<NextResponse | Response> {
    function handleRequestResponse(
        request: NextApiRequest,
        { params }
    ): Promise<NextResponse | Response> {
        const rpcActions = {
            UserList: new UserList(),
            UserById: new UserById({ id: "1" }),
            // Add other routes and corresponding RPC actions here
        };
        
        const rpcAction = rpcActions[params.rpc] || null;
        
        if (!rpcAction) {
            return Promise.resolve(NextResponse.json({ error: 'Unknown RPC action' }));
        }
        
        return router.pipe(
            RPCRouter.toHandler,
            (handler) => RPCResolver.make(handler),
            (resolver) => RPCResolver.toClient(resolver()),
            (client) => client(rpcAction),
            Effect.map((responses) => NextResponse.json(responses)),
            Effect.runPromise
        )
    }
    
    return handleRequestResponse;
}
