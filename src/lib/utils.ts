import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"
import {
    Router as RPCRouter,
    Rpc as RPC,
    Resolver as RPCResolver,
    ResolverNoStream as RPCResolverNoStream
} from "@effect/rpc"

import * as Schema from "@effect/schema/Schema"
import { TaggedRequest } from "@effect/schema/Schema";
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export {
    RPC,
    RPCRouter,
    RPCResolver,
    RPCResolverNoStream,
    Schema,
    TaggedRequest
}