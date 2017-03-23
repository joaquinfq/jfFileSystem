const Events = require('events');
const fs     = require('fs');
const path   = require('path');
/**
 * Clase de utilidad para manejar el sistema de archivos de manera síncrona.
 *
 * @namespace jf
 * @class     jf.FileSystem
 * @extends   Events
 */
module.exports = class jfFileSystem extends Events {
    /**
     * Indica si una ruta existe.
     *
     * @method exists
     *
     * @param {String} pathTo Ruta a verificar.
     *
     * @return {Boolean} `true` si la ruta existe.
     */
    exists(pathTo)
    {
        return fs.existsSync(path.join(...arguments));
    }

    /**
     * Muestra una traza por pantalla.
     * Antes de mostrarla se dispara un evento y se pasa por referencia
     * la etiqueta por si necesita traducirse.
     *
     * @method log
     *
     * @param {String}   level Nivel de la traza ('error', 'info', etc).
     * @param {String}   label Texto a mostrar con los placeholders incluidos.
     * @param {...Array} args  Argumentos a usar para reemplazar los placeholders de la etiqueta.
     */
    log(level, label, ...args)
    {
        const _payload = {
            level,
            label,
            args
        };
        this.emit('log', _payload);
        // Si algún manejador elimina la etiqueta, evitamos mostrar la traza por pantalla.
        if (_payload.label)
        {
            console.log(_payload.label, ..._payload.args);
        }
    }

    /**
     * Crea un directorio de manera recursiva.
     *
     * @method mkdir
     *
     * @param {String} dir Ruta a crear.
     */
    mkdir(dir)
    {
        dir = path.join(...arguments);
        if (!(this.exists(dir) && fs.statSync(dir).isDirectory()))
        {
            this.mkdir(path.dirname(dir));
            fs.mkdirSync(dir);
            this.log('info', 'Directorio %s creado', dir);
        }
    }

    /**
     * Devuelve el contenido de un archivo.
     *
     * @method read
     *
     * @param {String} filename Ruta del archivo leer.
     *
     * @return {String} Contenido del archivo.
     */
    read(filename)
    {
        return fs.readFileSync(path.join(...arguments), 'utf8');
    }

    /**
     * Elimina el contenido del directorio de manera recursiva.
     * Si se especifica un filtro, solamente se eliminan los archivos
     * donde el filtro devuelva `true`.
     * Se elimina un directorio si queda vacío.
     * Si no se quiere eliminar el directorio, se debe usar el método `clean`.
     *
     * @method rmdir
     *
     * @param {String}   dir     Ruta al directorio del cual se eliminará TODO su contenido.
     * @param {Number}   level   Número de niveles que mostrarán trazas.
     * @param {Function} filter  Función a usar para filtrar los archivos que se eliminarán.
     *
     * @return {Number} Total de archivos eliminados.
     */
    rmdir(dir, level = 0, filter = null)
    {
        let _count = 0;
        if (this.exists(dir) && fs.statSync(dir).isDirectory())
        {
            const _hasFilter = typeof filter === 'function';
            if (level > 0)
            {
                this.log('info', 'Eliminando archivos en %s', path.relative(__dirname, dir));
            }
            fs.readdirSync(dir).forEach(
                (file) =>
                {
                    const _filename = path.join(dir, file);
                    const _stat     = fs.statSync(_filename);
                    if (_stat.isDirectory())
                    {
                        _count += this.rmdir(_filename, level - 1, filter);
                    }
                    else if (_stat.isFile() && (!_hasFilter || filter(_filename)))
                    {
                        // Solamente lo eliminamos si pasa el filtro.
                        fs.unlinkSync(_filename);
                        ++_count;
                    }
                }
            );
            // Si el directorio está vacío, eliminamos el directorio.
            if (this.scandir(dir).length === 0)
            {
                fs.rmdirSync(dir);
            }
            if (level > 0)
            {
                this.log('info', '%s archivo(s) eliminado(s)', _count);
            }
        }
        return _count;
    }

    /**
     * Devuelve el listado de archivos presentes en un directorio de manera recursiva.
     *
     * @method scandir
     *
     * @param {String}  dir    Directorio donde empezará la búsqueda.
     * @param {RegExp?} filter Expresión regular para filtrar el resultado.
     *
     * @return {String[]} Listado de archivos.
     */
    scandir(dir, filter)
    {
        const _files = [];
        if (this.exists(dir))
        {
            const _stats = fs.statSync(dir);
            if (_stats.isDirectory())
            {
                fs.readdirSync(dir).forEach(
                    (file) =>
                    {
                        const _filename = path.join(dir, file);
                        const _stat     = fs.statSync(_filename);
                        if (_stat.isDirectory())
                        {
                            _files.push.apply(_files, this.scandir(_filename, filter));
                        }
                        else if (_stat.isFile())
                        {
                            if (!filter || filter.test(_filename))
                            {
                                _files.push(_filename);
                            }
                        }
                    }
                );
            }
            else if (_stats.isFile())
            {
                _files.push(dir);
            }
            else
            {
                this.log('info', 'Tipo de archivo no soportado: %s', dir);
            }
        }
        else
        {
            this.log('warn', 'Directorio no encontrado: %s', dir);
        }
        return _files.sort();
    }

    /**
     * Escribe el contenido en un archivo.
     *
     * @method write
     *
     * @param {String} filename Ruta del archivo escribir.
     * @param {String} content  Contenido del archivo a crear.
     */
    write(filename, content)
    {
        this.mkdir(path.dirname(filename));
        this.log('info', 'Escribiendo %s bytes en el archivo %s', content.length, filename);
        fs.writeFileSync(filename, content, 'utf8');
    }
};
