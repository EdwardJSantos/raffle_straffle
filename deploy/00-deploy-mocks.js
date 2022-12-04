const {developmentChains} = require("../helper-hardhat-config")


const BASE_FEE = ethers.utils.parseEther(".25")
const GAS_PRICE_LINK = 1e9

module.exports = async function ({getNamedAccounts, deployments}) {
    const {deploy, log} = deployments
    const {deployer } = await getNamedAccounts()
    const chainId = network.name
    const args = [BASE_FEE, GAS_PRICE_LINK]

    if (developmentChains.includes(network.name)) {
        log("Local network detected. Deploying mocks...")
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: args,
            log: true,

        })
        log("Mock Deployed")
        log("---------------------------------------")
    }
}

module.exports.tags = ["all", "mocks"]