const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const {developmentChains, networkConfig} = require("../../helper-hardhat-config")

developmentChains.includes(network.name) 
? describe.skip 
: describe("Raffle Unit Tests", function(){
    
    let raffle
    let raffleEntranceFee
    let deployer

    beforeEach(async function(){
        
        deployer = (await getNamedAccounts()).deployer
        raffle = await ethers.getContract("Raffle", deployer)
        raffleEntranceFee = await raffle.getEntranceFee()
        
    })

    describe("fulfillRandomWords", function(){
        it("Should use Chainlink Automation and VRF to pick a random winner", async function(){
            const startingTimeStamp = await raffle.getLatestTimeStamp()
            const accounts = await ethers.getSigners()
            await new Promise(async function(resolve, reject){
                raffle.once("winnerPicked", async function(){
                    console.log("Winner Picked, event fired!")
                    try{
                        const recentWinner = await raffle.getRecentWinner()
                        const raffleState = await raffle.getRaffleState()
                        const winnerEndingBalance = await accounts[0].getBalance()
                        const endingTimeStamp = await raffle.getLatestTimeStamp()
                        await expect(raffle.getPlayer(0)).to.be.reverted //If this reverts, its because the number of players have been reset
                        assert.equal(recentWinner.toString(), accounts[0].address)
                        assert.equal(raffleState.toString(),"0") //If raffle state is 0 then raffle is open
                        assert.equal(winnerEndingBalance.toString(),winnerStartingBalance.add(raffleEntranceFee).toString())
                        assert(endingTimeStamp > startingTimeStamp)
                        resolve()
                    }
                    catch(error){
                        console.log(error)
                        reject(e)
                    }
                })
                await raffle.enterRaffle({value: raffleEntranceFee})
                const winnerStartingBalance = await accounts[0].getBalanceO()
            })
        
        
        
        })
    })
})