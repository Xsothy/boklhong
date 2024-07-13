/**
 * @since 1.0.0
 */
import type {RPCRouterType} from "@/type";
import {RPCRouter, RPCResolver, RPC} from "@/lib/utils";
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import {pipe} from "effect/Function"
import type {NextApiRequest, NextApiResponse} from "next"
import {NextResponse} from "next/server";
import * as Schema from "@effect/schema/Schema";
import * as Rpc from "@effect/rpc/Rpc";
import * as Serializable from "@effect/schema/Serializable";
import * as Stream from "effect/Stream";
import type {ParseError} from "@effect/schema/ParseResult";
import * as Queue from "effect/Queue";
import * as Exit from "effect/Exit";
import * as Channel from "effect/Channel";
import * as Chunk from "effect/Chunk";
import {Router} from "@effect/rpc/Router";
import * as Cause from "effect/Cause";
import {SchemaClass} from "@effect/schema/Schema";
import {instanceOf} from "prop-types";
const EOF = Symbol.for("@effect/rpc/Router/EOF")
/**
 * @category tags
 * @since 1.0.0
 */
export const ApiRequest = Context.Tag<NextApiRequest>("@effect/rpc-nextjs/ApiRequest")

/**
 * @category models
 * @since 1.0.0
 */

// export interface RpcNextjsHandler<R extends RPCRouterType> {
//     (
//         request: NextApiRequest,
//         response: NextApiResponse
//     ): Effect.Effect<
//         RPCHandler,
//         never,
//         void
//     >
// }
export const withRequestTag = <A>(
    f: (
        request: Serializable.SerializableWithResult<any, any, any, any, any, any, any, any>
    ) => A
) => {
    const cache = new Map<string, A>()
    return (request: Schema.TaggedRequest.Any): A => {
        let result = cache.get(request._tag)
        if (result !== undefined) {
            return result
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        result = f(request as any)
        cache.set(request._tag, result)
        return result
    }
}
const channelFromQueue = <A>(queue: Queue.Queue<A | typeof EOF>) => {
    const loop: Channel.Channel<Chunk.Chunk<A>> = Channel.flatMap(
        Queue.takeBetween(queue, 1, Number.MAX_SAFE_INTEGER),
        (chunk) => {
            if (Chunk.unsafeLast(chunk) === EOF) {
                return Channel.write(Chunk.dropRight(chunk as Chunk.Chunk<A>, 1))
            }
            return Channel.zipRight(Channel.write(chunk as Chunk.Chunk<A>), loop)
        }
    ) as any
    return loop
}

const emptyExit = Schema.encodeSync(Schema.Exit({
    failure: Schema.Never,
    success: Schema.Never
}))(Exit.failCause(Cause.empty))

/**
 * @category constructors
 * @since 1.0.0
 */
export function make<R extends RPCRouterType>(router: R): (request: NextApiRequest, response: NextApiResponse) => Effect.Effect<Response, never, never> {
    const handler = RPCRouter.toHandler(router)
    const convertHandler = (router: RPCRouterType) => {
        console.log('handler')
        const spanPrefix = "Rpc.router "
        const schema = Schema
            .Union(
                ...[...router.rpcs].map((rpc) =>
                    Schema.transform(
                        rpc.schema,
                        Schema.typeSchema(Schema.Tuple(rpc.schema, Schema.Any)),
                        { strict: true, decode: (request) => [request, rpc] as const, encode: ([request]) => request }
                    )
                )
            )
        
        const schemaArray = Schema.Array(Rpc.RequestSchema(schema))

        const decode = Schema.decodeUnknown(schemaArray)
        const getEncode = withRequestTag((req) => Schema.encode(Serializable.exitSchema(req)))
        const getEncodeChunk = withRequestTag((req) => Schema.encode(Schema.Chunk(Serializable.exitSchema(req))))
        return (u: unknown): Stream.Stream<Router.Response, ParseError, Router.Context<R>> => {

            const program = pipe(
                decode(u),
                Effect.zip(Queue.unbounded<Router.Response | typeof EOF>()),
                Effect.tap(([requests, queue]) =>
                    pipe(
                        Effect.forEach(requests, (req, index) => {
                            const [request, rpc] = req.request
                            if (rpc._tag === "Effect") {
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                                const encode = getEncode(request)
                                return pipe(
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                                    Effect.exit(rpc.handler(request)),
                                    Effect.flatMap(encode),
                                    Effect.orDie,
                                    Effect.matchCauseEffect({
                                        onSuccess: (response) => Queue.offer(queue, [index, response]),
                                        onFailure: (cause) =>
                                            Effect.flatMap(
                                                encode(Exit.failCause(cause)),
                                                (response) => Queue.offer(queue, [index, response])
                                            )
                                    }),
                                    Effect.locally(Rpc.currentHeaders, req.headers as any),
                                    Effect.withSpan(`${spanPrefix}${request._tag}`, {
                                        kind: "server",
                                        parent: {
                                            _tag: "ExternalSpan",
                                            traceId: req.traceId,
                                            spanId: req.spanId,
                                            sampled: req.sampled,
                                            context: Context.empty()
                                        },
                                        captureStackTrace: false
                                    })
                                )
                            }
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                            const encode = getEncodeChunk(request)
                            return pipe(
                                rpc.handler(request),
                                Stream.toChannel,
                                Channel.mapOutEffect((chunk) =>
                                    Effect.flatMap(
                                        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                                        encode(Chunk.map(chunk as any, Exit.succeed)),
                                        (response) => Queue.offer(queue, [index, response])
                                    )
                                ),
                                Channel.runDrain,
                                Effect.matchCauseEffect({
                                    onSuccess: () => Queue.offer(queue, [index, [emptyExit]]),
                                    onFailure: (cause) =>
                                        Effect.flatMap(
                                            encode(Chunk.of(Exit.failCause(cause))),
                                            (response) => Queue.offer(queue, [index, response])
                                        )
                                }),
                                Effect.locally(Rpc.currentHeaders, req.headers as any),
                                Effect.withSpan(`${spanPrefix}${request._tag}`, {
                                    kind: "server",
                                    parent: {
                                        _tag: "ExternalSpan",
                                        traceId: req.traceId,
                                        spanId: req.spanId,
                                        sampled: req.sampled,
                                        context: Context.empty()
                                    },
                                    captureStackTrace: false
                                })
                            )
                        }, { concurrency: "unbounded", discard: true }),
                        Effect.ensuring(Queue.offer(queue, EOF)),
                        Effect.fork
                    )
                ),
                Effect.map(([_, queue]) => Stream.fromChannel(channelFromQueue(queue))),
                Stream.unwrap
            );
          
            return program
        }
        
    }

    async function handleRequestResponse(
        request: NextApiRequest,
        response: NextApiResponse
    ) {
        convertHandler(router)(request)
        const stream = Stream.catchAll(handler(request), e => {
            return Stream.succeed(e)
        })
        return await Effect.runPromise(Stream.runCollect(stream)).then(responses => {
            console.log('responses', Chunk.get(0)(responses))
            return NextResponse.json(Chunk.get(0)(responses))
        });
        const program = pipe(
            Effect.sync(() => {
                console.log('hello')
                return handler(request.body)
            }),
            Effect.provideService(ApiRequest, request),
            Effect.tap((request) => console.log('hello')),
            Effect.tap((responses) =>
                Effect.sync(() => {
                    response.json(responses)
                })
            ),
            Effect.catchAllCause((cause) =>
                Effect.flatMap(Effect.logError(cause), () =>
                    Effect.sync(() => {
                        response.writeHead(500)
                        response.end()
                    }))
            ),
            Effect.map((responses) => NextResponse.json(responses))
        )
        return program
    }
    
    return handleRequestResponse
}