import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import nodemailer from 'nodemailer'
import { z } from 'zod';
import { prisma } from "../lib/prisma"
import { getMailClient } from "../lib/mail"
import { dayjs } from "../lib/dayjs"

export async function confirmTrip(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get('/trips/:tripId/confirm', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
            })
        }
    }, async (request, reply) => {
        const { tripId } = request.params

        const trip = await prisma.trip.findUnique({
            where: {
                id: tripId
            },
            include: { // join with participants
                participants: {
                    where: { is_owner: false }
                }
            }
        })

        if (!trip) {
            throw new Error('Trip not found.')
        }

        if (trip.is_confirmed) {
            return reply.redirect(`http://localhost:3000/trips/${tripId}`) // redireciona para o frontend
        }

        await prisma.trip.update({
            where: { id: tripId },
            data: { is_confirmed: true }
        })

        // Pegar todos os participantes
        // const participantes = await prisma.participant.findMany({
        //     where: {
        //         id: tripId,
        //         is_owner: false
        //     },
        // })

        // format date
        const formattedStartDate = dayjs(trip.starts_at).format('LL')
        const formattedEndDate = dayjs(trip.ends_at).format('LL')

        // sending mail
        const mail = await getMailClient()

        await Promise.all(trip.participants.map(async (participant) => {// executando metodos assincronos em paralelo
            // Creating confirmation link
            const confirmationLink = `http://localhost:3333/trips/${trip.id}/confirm/${participant.id}`

            const message = await mail.sendMail({
                from: {
                    name: 'Equipe plann.er',
                    address: 'oi@plann.er',
                },
                to: participant.email,
                subject: `Confirme sua presenca na viagem para ${trip.destination} em ${formattedStartDate}`,
                html: `
                    <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
                        <p>Voce foi convidado (a) para participar numa viagem para <strong>${trip.destination}</strong> nas datas de <strong>${formattedStartDate}</strong> ate <strong>${formattedEndDate}</strong>.</p>
                        <p></p>
                        <p>Para confirmar sua presenca na viagem, clique no link abaixo: </p>
                        <p></p>
                        <p>
                            <a href="${confirmationLink}">Confirmar viagem</a>
                        </p>
                        <p></p>
                        <p>Caso voce nao saiba do que se trata esse email, apenas ignore esse email</p>
                    </div>
                `.trim()
            })

            console.log(nodemailer.getTestMessageUrl(message)) // Testing mail sender
        }))

        return reply.redirect(`http://localhost:3000/trips/${tripId}`)
    })
}