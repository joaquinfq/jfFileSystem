const Events = require('events');
const fs     = require('fs');
const path   = require('path');
/**
 * Instancia para usar como singleton la clase.
 *
 * @type {jf.FileSystem|null}
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
     * @param {string} fromDir Directorio origen.
     * @param {string} toDir   Directorio destino.
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
     * @param {string} pathname Ruta a verificar.
     *
     * @return {boolean} `true` si la ruta existe.
     */
    exists(pathname)
    {
        return fs.existsSync(path.join(...arguments));
    }

    /**
     * Encuentra un archivo recorriendo los directorios padres.
     *
     * @method findUp
     *
     * @param {string}  directory Ruta del directorio a partir del cual se buscará.
     * @param {string}  filename  Nombre del archivo a buscar.
     * @param {boolean} asFile    Devolver la ruta del archivo en vez de la ruta del directorio.
     *
     * @return {string|null} Ruta que contiene el archivo o `null` si no se encontró el archivo.
     */
    findUp(directory, filename, asFile = false)
    {
        let _result = path.resolve(directory);
        const _root = path.parse(_result).root;
        while (_result !== _root && !this.exists(_result, filename))
        {
            _result = path.dirname(_result);
        }
        if (this.exists(_result, filename))
        {
            if (asFile)
            {
                _result = path.join(_result, filename);
            }
        }
        else
        {
            _result = null;
        }

        return _result;
    }

    /**
     * Indica si la ruta especificada es un directorio.
     *
     * @method isDirectory
     *
     * @param {string} path Ruta a verificar.
     *
     * @return {boolean} `true` si la ruta existe y es un directorio.
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
     * @return {boolean} `true` si la ruta existe y es un archivo.
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
     * @param {string}   level Nivel de la traza ('error', 'info', etc).
     * @param {string}   name  Nombre de la traza que permita identificarla. Por defecto es el nombre de la clase.
     * @param {string}   label Texto a mostrar con los placeholders incluidos.
     * @param {...array} args  Argumentos a usar para reemplazar los placeholders de la etiqueta.
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
     * @param {string} dir Ruta a crear.
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
     * @param {string} filename Ruta del archivo leer.
     * @param {string} encoding Codificación del archivo a leer.
     *
     * @return {string|Buffer} Contenido del archivo.
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
     * @param {string} oldPath Ruta del archivo a renombrar.
     * @param {string} newPath Nueva ruta del archivo.
     *
     * @return {string} Contenido del archivo.
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
     * @param {string}           dir    Ruta al directorio del cual se eliminará TODO su contenido.
     * @param {number?}          level  Número de niveles que mostrarán trazas.
     * @param {function|RegExp?} filter Expresión regular a usar para filtrar los archivos que se eliminarán.
     *
     * @return {number} Total de archivos eliminados.
     */
    rmdir(dir, level = 0, filter = null)
    {
        let _count = 0;
        if (!filter || (typeof filter === 'function' && filter(dir)) || (filter instanceof RegExp && filter.test(dir)))
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
     * @param {string}           dir    Directorio donde empezará la búsqueda.
     * @param {function|RegExp?} filter Expresión regular para filtrar el resultado.
     *
     * @return {string[]} Listado de archivos.
     */
    scandir(dir, filter = null)
    {
        const _files = [];
        if (!filter || (typeof filter === 'function' && filter(dir)) || (filter instanceof RegExp && filter.test(dir)))
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
     * @param {string}        filename Ruta del archivo escribir.
     * @param {string|Buffer} content  Contenido del archivo a crear.
     * @param {string}        encoding Codificación del archivo a leer.
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
     * @method i
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
