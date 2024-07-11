import fastify from "fastify"; //npm i fastify -- to install the library 
import cors from "@fastify/cors" // npm i @fastify/cors
import { prisma } from "./lib/prisma"
import { createTrip } from "./routes/create-trip";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { confirmTrip } from "./routes/confirm-trip";

const app = fastify()

// ========= Configuring cors
app.register(cors, {
    origin: '*'
})

//========= Configurind plugin fastify-type-provider-zod
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

//========= Registring created routes
app.register(createTrip)
app.register(confirmTrip)

// ======== Configuring server
app.listen({ port: 3333 }).then(() => {
    console.log('Server running!')
})
