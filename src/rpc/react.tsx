"use client";
import { RPCClient, RPC } from "@/lib/utils";
import {appRouter} from "@/server/api";
import {UserList} from "@/server/api/request";

const api = RPCClient.make(
    appRouter,
    (req) => req.headers.get("x-trpc-source") === "nextjs-react"
);

