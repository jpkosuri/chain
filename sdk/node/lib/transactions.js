const shared = require('./shared')
const errors = require('./errors')

// TODO: replace with default handler in requestSingle/requestBatch variants
function checkForError(resp) {
  if ('code' in resp) {
    throw errors.create(
      errors.types.BAD_REQUEST,
      errors.formatErrMsg(resp, ''),
      {body: resp}
    )
  }
  return resp
}

/**
 * @class
 */
class TransactionBuilder {
  constructor() {
    this.actions = []
  }

  baseTransaction(raw_tx) {
    this.base_transaction = raw_tx
  }

  issue(params) {
    this.actions.push(Object.assign({}, params, {type: 'issue'}))
  }

  controlWithAccount(params) {
    this.actions.push(Object.assign({}, params, {type: 'control_account'}))
  }

  controlWithProgram(params) {
    this.actions.push(Object.assign({}, params, {type: 'control_program'}))
  }

  spendFromAccount(params) {
    this.actions.push(Object.assign({}, params, {type: 'spend_account'}))
  }

  spendUnspentOutput(params) {
    this.actions.push(Object.assign({}, params, {type: 'spend_account_unspent_output'}))
  }

  retire(params) {
    this.actions.push(Object.assign({}, params, {type: 'control_program', control_program: '6a'}))
  }
}

/**
 * @class
 */
class Transactions {
  /**
   * constructor - return Transactions object configured for specified Chain Core
   *
   * @param  {Client} client Configured Chain client object
   */
  constructor(client) {
    /**
     * Get one page of transactions matching the specified filter
     *
     * @param {Filter} [params={}] Filter and pagination information
     * @returns {Page} Requested page of results
     */
    this.query = (params) => shared.query(client, this, '/list-transactions', params)

    /**
     * Request all transactions matching the specified filter, calling the
     * supplied processor callback with each item individually.
     *
     * @param {Filter} params Filter and pagination information.
     * @param {QueryProcessor} processor Processing callback.
     * @return {Promise} A promise resolved upon processing of all items, or
     *                   rejected on error
     */
    this.queryAll = (params, processor) => shared.queryAll(this, params, processor)

    this.build = (builderBlock) => {
      const builder = new TransactionBuilder()
      builderBlock(builder)

      return client.request('/build-transaction', [builder])
        .then(resp => checkForError(resp[0]))
    }

    this.buildBatch = (builderBlocks) => {
      const builders = builderBlocks.map((builderBlock) => {
        const builder = new TransactionBuilder()
        builderBlock(builder)
        return builder
      })

      return shared.createBatch(client, '/build-transaction', builders)
    }

    this.submit = (signed) => {
      return client.request('/submit-transaction', {transactions: [signed]})
        .then(resp => checkForError(resp[0]))
    }

    this.submitBatch = (signed) => {
      return client.request('/submit-transaction', {transactions: signed})
        .then(resp => {
          return {
            successes: resp.filter((item) => !item.code),
            errors: resp.filter((item) => item.code),
            response: resp,
          }
        })
    }
  }
}

module.exports = Transactions
