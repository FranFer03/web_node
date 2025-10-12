FROM nginx:alpine

# Copia todos los archivos al directorio web de Nginx
COPY . /usr/share/nginx/html

# Expone el puerto 80
EXPOSE 80

# Inicia Nginx en foreground
CMD ["nginx", "-g", "daemon off;"]
