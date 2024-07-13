import type {RPCRouterType} from '@/type';

import {RPCRouter} from "@/lib/utils";
import {userRouter} from "@/server/api/routers/user";



export const appRouter: RPCRouterType  = RPCRouter.make(
    userRouter
);

export type AppRouter = typeof appRouter