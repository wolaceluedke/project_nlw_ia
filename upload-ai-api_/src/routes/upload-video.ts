// Importação dos módulos e bibliotecas necessárias
import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart";
import { prisma } from "../lib/prisma";
import path from "node:path"; // Módulo para manipulação de caminhos de arquivos
import fs from 'node:fs'; // Módulo para manipulação de arquivos do sistema
import { pipeline } from 'node:stream'; // Módulo para trabalhar com streams
import { promisify } from 'node:util'; // Módulo para promisificar funções de callback
import { randomUUID } from "node:crypto"; // Módulo para gerar UUIDs aleatórios

// Função para promisificar a função 'pipeline' para facilitar o uso
const pump = promisify(pipeline)

// Função para rota de upload de vídeo
export async function uploadVideoRoute(app: FastifyInstance) {
  // Registrando o plugin 'fastifyMultipart' para lidar com uploads multipart/form-data
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_579 * 50, // Limitando o tamanho do arquivo a 25 MB
    }
  })

  // Definindo uma rota POST para receber os uploads
  app.post('/videos', async (request, reply) => {
    // Obtendo os dados do arquivo enviado na requisição
    const data = await request.file()
    
    // Verificando se não há dados de arquivo na requisição
    if (!data) {
      return reply.status(400).send({ error: 'Missing file input.' })
    }

    // Obtendo a extensão do arquivo
    const extension = path.extname(data.filename)
    
    // Verificando se a extensão do arquivo não é .mp3
    if (extension != '.mp3') {
      return reply.status(400).send({ error: 'Invalid input type, please upload an MP3 file.' })
    }

    // Obtendo o nome base do arquivo sem a extensão
    const fileBaseName = path.basename(data.filename, extension)
    
    // Gerando um nome único para o arquivo usando um UUID aleatório
    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`
    
    // Definindo o caminho de destino para salvar o arquivo
    const uploadDestination = path.resolve(__dirname, '../../tmp', fileUploadName)

    // Utilizando a função 'pump' para copiar os dados do arquivo para o destino
    await pump(data.file, fs.createWriteStream(uploadDestination))

    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadDestination
      }
    })

    return {
      video
    }
  })
}
