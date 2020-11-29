const fs = require('fs')

const DATA_DIRECTORY = './data'

class DataManager {
  /**
   * @param {string} filename
   */
  constructor(filename) {
    this.filepath = `${DATA_DIRECTORY}/${filename}`
  }

  /**
   * @returns {Promise<Array|Object|null>}
   */
  read() {
    return new Promise((resolve, reject) => {
      fs.access(this.filepath, fs.F_OK, (err) => {
        if (err) {
          resolve(null)

          return
        }

        fs.readFile(this.filepath, (err, data) => {
          if (err) {
            reject(err)

            return
          }

          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(e)
          }
        })
      })
    })
  }

  /**
   * @param {Object} data
   *
   * @return {Promise<void>}
   */
  write(data) {
    return new Promise((resolve, reject) => {
      const content = JSON.stringify(data, null, 2)

      fs.writeFile(this.filepath, content, (err) => {
        if (err) {
          reject(err)

          return
        }

        resolve()
      })
    })
  }

  /**
   * @param {string} key
   * @param value
   * @return {Promise<Object[]>}
   */
  async findBy(key, value) {
    const found = []
    const entries = await this.read()

    if (!entries) {
      return []
    }

    if (!Array.isArray(entries)) {
      throw new Error('Data is not an array')
    }

    entries.forEach((entry) => {
      if (entry.hasOwnProperty(key) && entry[key] === value) {
        found.push(entry)
      }
    })

    return found
  }

  /**
   * @param {Object} data
   * @return {Promise<void>}
   */
  async insert(data) {
    const entries = (await this.read()) || []

    if (!Array.isArray(entries)) {
      throw new Error('Data is not an array')
    }

    entries.push(data)
    await this.write(entries)
  }

  /**
   * @param {Object} data
   * @param {string} lookupKey
   * @param lookupValue
   * @return {Promise<void>}
   */
  async update(data, lookupKey, lookupValue) {
    const entries = await this.read()

    if (entries) {
      if (!Array.isArray(entries)) {
        throw new Error('Data is not an array')
      }

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]

        if (entry.hasOwnProperty(lookupKey) && entry[lookupKey] === lookupValue) {
          entries[i] = data
          await this.write(entries)

          return
        }
      }
    }

    throw new Error('Could not find record')
  }

  /**
   * @param {string} lookupKey
   * @param lookupValue
   * @return {Promise<void>}
   */
  async delete(lookupKey, lookupValue) {
    const entries = await this.read()

    if (entries) {
      if (!Array.isArray(entries)) {
        throw new Error('Data is not an array')
      }

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]

        if (entry.hasOwnProperty(lookupKey) && entry[lookupKey] === lookupValue) {
          entries.splice(i, 1)
          await this.write(entries)

          return
        }
      }
    }

    throw new Error('Could not find record')
  }
}

module.exports = DataManager
