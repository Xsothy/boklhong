// router.ts
import { Router, Rpc } from "@effect/rpc"
import { Effect, Ref } from "effect"
import { User, UserById, UserCreate, UserList } from "@/server/api/request"

// ---------------------------------------------
// Imaginary Database
// ---------------------------------------------

const ref = Ref.unsafeMake<Array<User>>([
    new User({ id: "1", name: "Alice" }),
    new User({ id: "2", name: "Bob" })
])

const db = {
    user: {
        findMany: () => ref.get,
        findById: (id: string) =>
            Ref.get(ref).pipe(
                Effect.andThen((users) => {
                    const user = users.find((user) => user.id === id)
                    return user
                        ? Effect.succeed(user)
                        : Effect.fail(`User not found: ${id}`)
                })
            ),
        create: (name: string) =>
            Ref.updateAndGet(ref, (users) => [
                ...users,
                new User({ id: String(users.length + 1), name })
            ]).pipe(Effect.andThen((users) => users[users.length - 1]))
    }
}

export const userList = Rpc.effect(UserList, () => db.user.findMany())
export const userById = Rpc.effect(UserById, ({ id }) => db.user.findById(id))
const userCreate = Rpc.effect(UserCreate, ({ name }) => db.user.create(name))
export const userRouter = Router.make(
    userList,
    userById,
    userCreate
)
export type UserRouter = typeof userRouter
export type UserListRpc = typeof userList
export type UserByIdRpc = typeof userById
export type UserCreateRpc = typeof userCreate