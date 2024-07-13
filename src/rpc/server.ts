/**
 * @since 1.0.0
 */
import {RPCRouter, RPC, Schema, RPCResolver} from "@/lib/utils";
import { Context, pipe, Effect } from "effect";
import type { NextApiRequest, NextApiResponse} from "next";
import {NextResponse} from "next/server";

import type { RPCRouterType } from "@/type";
import {UserList} from "@/server/api/request";

export const ApiRequest = Context.Tag<NextApiRequest>("@app/ApiRequest");

export function make<R extends RPCRouterType>(router: R): (request: NextApiRequest, {params}: {
    params: { rpc: string }
}) => Promise<NextResponse | Response> {
    const handler = RPCRouter.toHandler(router);
    const resolver = RPCResolver.make(handler)
    const client = RPCResolver.toClient(
        resolver(),
    );
    function handleRequestResponse(
        request: NextApiRequest,
        { params }
    ): Promise<NextResponse | Response> {
        const rpcActions = {
            UserList: new UserList(),
            // Add other routes and corresponding RPC actions here
        };
        
        const rpcAction = rpcActions[params.rpc] || null;
        
        if (!rpcAction) {
            return Promise.resolve(NextResponse.json({ error: 'Unknown RPC action' }));
        }
        
        return pipe(
            client(rpcAction),
            Effect.map((responses) => NextResponse.json(responses)),
            Effect.runPromise
        )
    }
    
    return handleRequestResponse;
}
