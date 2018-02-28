const Events = require('events');
const fs     = require('fs');
const path   = require('path');
/**
 * Instancia para usar como singleton la clase.
 *
 * @type {null|jf.FileSystem}
 */
let instance = null;
/**
 * Clase de utilidad para manejar el sistema de archivos de manera síncrona.
 *
 * @namespace jf
 * @class     jf.FileSystem
 * @extends   Events
 */
module.exports = class jfFileSystem extends Events
{
    /**
     * Copia el contenido de un archivo o directorio a otra ubicación.
     *
     * @method copy
     *
     * @param {String} fromDir Directorio origen.
     * @param {String} toDir   Directorio destino.
     */
    copy(fromDir, toDir)
    {
        this.scandir(fromDir).forEach(
            file => this.write(
                file === fromDir
                    ? path.join(toDir, path.basename(file))
                    : path.join(toDir, path.relative(fromDir, file)),
                this.read(file, null),
                null
            )
        );
    }

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
     * Encuentra un archivo recorriendo los directorios padres.
     *
     * @param {String} directory Ruta del directorio a partir del cual se buscará.
     * @param {String} filename  Nombre del archivo a buscar.
     *
     * @return {String}
     */
    findUp(directory, filename)
    {
        if (directory[0] !== path.sep)
        {
            directory = path.resolve(process.cwd(), directory);
        }
        const _root = path.parse(directory).root;
        while (directory !== _root && !this.exists(directory, filename))
        {
            directory = path.dirname(directory);
        }

        return directory;
    }

    /**
     * Indica si la ruta especificada es un directorio.
     *
     * @method isDirectory
     *
     * @param {String} path Ruta a verificar.
     *
     * @return {Boolean} `true` si la ruta existe y es un directorio.
     */
    isDirectory(path)
    {
        return this.exists(path)
            ? fs.statSync(path).isDirectory()
            : false;
    }

    /**
     * Indica si la ruta especificada es un archivo.
     *
     * @method isFile
     *
     * @param {String} path Ruta a verificar.
     *
     * @return {Boolean} `true` si la ruta existe y es un archivo.
     */
    isFile(path)
    {
        return this.exists(path)
            ? fs.statSync(path).isFile()
            : false;
    }

    /**
     * Muestra una traza por pantalla.
     *
     * Antes de mostrarla se dispara un evento y se pasa por referencia
     * la etiqueta por si necesita traducirse o hacer algún cambio.
     *
     * Si el manejador elimina el atributo `label`, no se muestra la
     * traza por pantalla.
     *
     * @method log
     *
     * @param {String}   level Nivel de la traza ('error', 'info', etc).
     * @param {String}   name  Nombre de la traza que permita identificarla. Por defecto es el nombre de la clase.
     * @param {String}   label Texto a mostrar con los placeholders incluidos.
     * @param {...Array} args  Argumentos a usar para reemplazar los placeholders de la etiqueta.
     */
    log(level, name, label, ...args)
    {
        if (!name)
        {
            name = this.constructor.name;
        }
        //------------------------------------------------------------------------------
        // Los datos se pasan en un objeto para que puedan ser modificados.
        // Si algún manejador del evento `log` elimina la etiqueta,
        // no se mostrará la traza por pantalla.
        // Este manejador podrá traducir la etiqueta si es necesario.
        //------------------------------------------------------------------------------
        const _data = { level, label, name, args };
        this.emit('log', _data);
        if (_data.label)
        {
            console[_data.level](`[${_data.name}] ${_data.label}`, ..._data.args);
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
        if (!this.isDirectory(dir))
        {
            this.mkdir(path.dirname(dir));
            fs.mkdirSync(dir);
            this.log('info', '', 'Directorio %s creado', dir);
        }
    }

    /**
     * Devuelve el contenido de un archivo.
     *
     * @method read
     *
     * @param {String} filename Ruta del archivo leer.
     * @param {String} encoding Codificación del archivo a leer.
     *
     * @return {String|Buffer} Contenido del archivo.
     */
    read(filename, encoding = 'utf8')
    {
        return fs.readFileSync(filename, encoding);
    }

    /**
     * Renombra o mueve de ubicación un archivo.
     *
     * @method rename
     *
     * @param {String} oldPath Ruta del archivo a renombrar.
     * @param {String} newPath Nueva ruta del archivo.
     *
     * @return {String} Contenido del archivo.
     */
    rename(oldPath, newPath)
    {
        return fs.renameSync(oldPath, newPath);
    }

    /**
     * Elimina el contenido del directorio de manera recursiva.
     *
     * Si se especifica un filtro, solamente se eliminan los archivos
     * donde el filtro devuelva `true`.
     *
     * Se elimina un directorio si queda vacío.
     * Si no se quiere eliminar el directorio, se debe usar el método `clean`.
     *
     * @method rmdir
     *
     * @param {String}  dir    Ruta al directorio del cual se eliminará TODO su contenido.
     * @param {Number?} level  Número de niveles que mostrarán trazas.
     * @param {RegExp?} filter Expresión regular a usar para filtrar los archivos que se eliminarán.
     *
     * @return {Number} Total de archivos eliminados.
     */
    rmdir(dir, level = 0, filter = null)
    {
        let _count = 0;
        if (!filter || filter.test(dir))
        {
            const _stat = fs.lstatSync(dir);
            if (_stat.isDirectory())
            {
                if (level > 0)
                {
                    this.log('info', '', 'Eliminando archivos en %s', path.relative(__dirname, dir));
                }
                fs.readdirSync(dir).forEach(
                    file => _count += this.rmdir(path.join(dir, file), level - 1, filter)
                );
                // Si el directorio está vacío, eliminamos el directorio.
                if (this.scandir(dir).length === 0)
                {
                    fs.rmdirSync(dir);
                }
            }
            else if (_stat.isFile() || _stat.isSymbolicLink())
            {
                fs.unlinkSync(dir);
                ++_count;
            }
            if (level > 0)
            {
                this.log('info', '', '%s archivo(s) eliminado(s)', _count);
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
    scandir(dir, filter = null)
    {
        const _files = [];
        if (!filter || filter.test(dir))
        {
            if (this.exists(dir))
            {
                const _stats = fs.lstatSync(dir);
                if (_stats.isDirectory())
                {
                    fs.readdirSync(dir).forEach(
                        file => _files.push(...this.scandir(path.join(dir, file), filter))
                    );
                }
                else if (_stats.isFile())
                {
                    _files.push(dir);
                }
                else if (!_stats.isSymbolicLink())
                {
                    this.log('info', '', 'Tipo de archivo no soportado: %s', dir);
                }
            }
            else
            {
                this.log('warn', '', 'Directorio no encontrado: %s', dir);
            }
            _files.sort();
        }

        return _files;
    }

    /**
     * Escribe el contenido en un archivo.
     *
     * @method write
     *
     * @param {String}        filename Ruta del archivo escribir.
     * @param {Buffer|String} content  Contenido del archivo a crear.
     * @param {String}        encoding Codificación del archivo a leer.
     */
    write(filename, content, encoding = 'utf8')
    {
        this.mkdir(path.dirname(filename));
        this.log('info', '', 'Escribiendo %s bytes en el archivo %s', content.length, filename);
        fs.writeFileSync(filename, content, encoding);
    }

    /**
     * Devuelve una instancia de la clase.
     * Permite usar la clase como un singleton.
     *
     * @return {null|jf.FileSystem}
     */
    static i()
    {
        if (!instance)
        {
            instance = new this();
        }
        return instance;
    }
};
