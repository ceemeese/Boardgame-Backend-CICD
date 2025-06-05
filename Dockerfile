# Imagen base
FROM node:22 

# Añadir archivos en el directorio
WORKDIR /app
# Cache e instalar dependencias
COPY package.json .
RUN npm install
# Copiar ficheros app
COPY . .
# Puerto expuesto de node
EXPOSE 8080
# Comando de inicio app al iniciar contenedor 
CMD [ "npm", "start" ]