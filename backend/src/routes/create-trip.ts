import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import nodemailer from 'nodemailer'
import { z } from 'zod';
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail"
import { dayjs } from "../lib/dayjs"

export async function createTrip(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/trips', {
        schema: {
            body: z.object({
                destination: z.string().min(4),
                starts_at: z.coerce.date(), // try convert val string to date
                ends_at: z.coerce.date(),
                owner_name: z.string(), // requester name
                owner_email: z.string().email(), // requester email
                emails_to_invite: z.array(z.string().email()),
            })
        }
    }, async (request) => {
        const { destination, starts_at, ends_at, owner_name, owner_email, emails_to_invite } = request.body // here we are doing a desconstrucao

        if (dayjs(starts_at).isBefore(new Date())) { // Validating date to never be before date now
            throw new Error('Invalid trip date')
        }

        if (dayjs(ends_at).isBefore(starts_at)) {
            throw new Error('Invalid trip date')
        }

        const trip = await prisma.trip.create({ // creating trip
            data: {
                destination,
                starts_at,
                ends_at,
                participants: {
                    createMany: {
                        data: [
                            {
                                name: owner_name,
                                email: owner_email,
                                is_owner: true,
                                is_confirmed: true
                            },
                            ...emails_to_invite.map(email => { // map converte objecto em array o ... concatena ao array principal
                                return { email }
                            })
                        ]
                    }
                }
            }
        })

        // format date
        const formattedStartDate = dayjs(starts_at).format('LL')
        const formattedEndDate = dayjs(ends_at).format('LL')

        // Creating confirmation link
        const confirmationLink = `http://localhost:3333/trips/${trip.id}/confirm`

        // sending mail
        const mail = await getMailClient()

        const message = await mail.sendMail({
            from: {
                name: 'Equipe plann.er',
                address: 'oi@plann.er',
            },
            to: {
                name: owner_name,
                address: owner_email,
            },
            subject: `Confirme sua viagem para ${destination} em ${formattedStartDate}`,
            html: `
                <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
                    <p>Voce solicitou a criacao de uma viagem para <strong>${destination}</strong> nas datas de <strong>${formattedStartDate}</strong> ate <strong>${formattedEndDate}</strong>.</p>
                    <p></p>
                    <p>Para confirmar sua viagem, clique no link abaixo: </p>
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

        return {
            tripId: trip.id
        }
    })
}