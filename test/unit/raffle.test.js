const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const {developmentChains, networkConfig} = require("../../helper-hardhat-config")

!developmentChains.includes(network.name) 
? describe.skip 
: describe("Raffle Unit Tests", function(){
    
    let raffle
    let vrfCoordinatorV2Mock
    let raffleEntranceFee
    let deployer
    const chainId = network.config.chainId
    let interval
    

    beforeEach(async function(){
        
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        raffle = await ethers.getContract("Raffle", deployer)
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
        raffleEntranceFee = await raffle.getEntranceFee()
        interval = await raffle.getInterval()
        
    })

    console.log("hey at least I got this far")

    describe("constructor", function() {
        it("initializes the raffle correctly", async function(){
            const raffleState = await raffle.getRaffleState()
            assert.equal(raffleState.toString(),"0")
            assert.equal(interval.toString(), networkConfig[chainId]["interval"])

        })
    })

    describe("enterRaffle", function(){
        it("reverts when you don't pay enough",async function(){
            await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughETHEntered")
        })
        it("records players when they enter", async function(){
            await raffle.enterRaffle({value: raffleEntranceFee})
            const playerFromContract = await raffle.getPlayer(0)
            assert.equal(playerFromContract, deployer)
    
        })
        it("Should emit an event when raffle is entered", async function(){
            await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.emit(raffle,"raffleEntered")
        })
        it("Should not allow entrance while raffle is not open", async function(){
            await raffle.enterRaffle({value: raffleEntranceFee})
            await network.provider.send("evm_increaseTime", [interval.toNumber()+1])
            await network.provider.send("evm_mine",[])
            await raffle.performUpkeep([])
            await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.be.revertedWith("Raffle__NotOpen")

        })

    })

    describe("checkUpkeep", function(){
        it("returns false if no one has send ETH to raffle", async function(){
            await network.provider.send("evm_increaseTime", [interval.toNumber()+1])
            await network.provider.send("evm_mine",[])
            const {upkeepNeeded} = await raffle.callStatic.checkUpkeep([])
            assert(!upkeepNeeded)
        })
        it("should return false if raffle isn't open", async function(){
            await raffle.enterRaffle({value: raffleEntranceFee})
            await network.provider.send("evm_increaseTime", [interval.toNumber()+1])
            await network.provider.send("evm_mine",[])
            await raffle.performUpkeep([])
            const raffleState = await raffle.getRaffleState()
            const {upkeepNeeded} = await raffle.callStatic.checkUpkeep([])
            assert.equal(raffleState.toString(),"1")
            assert.equal(upkeepNeeded, false)

        })
        it("returns false if enough time hasn't passed", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() - 5])
            await network.provider.request({ method: "evm_mine", params: [] })
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
            assert(!upkeepNeeded)
        })
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
            assert(upkeepNeeded)
        })
    })

    describe("perfromUpkeep", function(){
        it("should only performUpkeep if checkUpkeep is true", async function(){
            await raffle.enterRaffle({value: raffleEntranceFee})
            await network.provider.send("evm_increaseTime", [interval.toNumber()+1])
            await network.provider.send("evm_mine",[])
            const tx = await raffle.performUpkeep([])
            assert (tx)
        })

        it("Should revert when checkUpkeep is false", async function(){
            await expect(raffle.performUpkeep([])).to.be.revertedWith("Raffle__UpkeepNotNeeded")
        })

        it("Should update raffleState, emit an event, and call VRFCoordinator", async function(){

        })
    })

    describe("fulfillRandomWords", function(){
        beforeEach(async function(){
            await raffle.enterRaffle({value: raffleEntranceFee})
            await network.provider.send("evm_increaseTime", [interval.toNumber()+1])
            await network.provider.send("evm_mine",[])
        })

        it("fulfillRandomWords should only be able to be called after performUpkeep", async function(){
            await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)).to.be.revertedWith("nonexistent request")
            await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)).to.be.revertedWith("nonexistent request")

            
        })

        it("Pick a winner, reset the raffle, and send money to the winner", async function(){
            const additionalEntrants = 3
            const startingAccountIndex = 1 //deployer = 0 , so next account needs to start at index 1
            var accounts = await ethers.getSigners()
            const startingTimeStamp = await raffle.getLatestTimeStamp()
            for(let i = startingAccountIndex; i< startingAccountIndex + additionalEntrants; i++){
                const accountConnectedRaffle = raffle.connect(accounts[i])
                await accountConnectedRaffle.enterRaffle({value: raffleEntranceFee})
            }
            await new Promise(async function(resolve, reject){
                raffle.once("winnerPicked", async function(){
                    try{
                        const recentWinner = await raffle.getRecentWinner()
                        console.log(recentWinner)
                        console.log(accounts[1].address)
                        console.log(accounts[2].address)
                        console.log(accounts[3].address)
                        const winnerEndingBalance = await accounts[1].getBalance()
                        const raffleState = await raffle.getRaffleState()
                        const endingTimeStamp = await raffle.getLatestTimeStamp()
                        const numPlayers = await raffle.getNumPlayers()
                        assert.equal(numPlayers.toString(),"0")
                        assert.equal(raffleState.toString(),"0")// raffle state of 0 means OPEN, 1 means Closed
                        assert(endingTimeStamp > startingTimeStamp)
                        assert.equal(
                            winnerEndingBalance.toString(), 
                            winnerStartingBalance.add(
                                raffleEntranceFee
                                .mul(additionalEntrants)
                                .add(raffleEntranceFee)
                                .toString()
                                )
                        )

                    }
                    catch(e){
                        reject(e)
                    }
                    resolve()
                })
                const tx = await raffle.performUpkeep([])
                const txReceipt = await tx.wait(1)
                const winnerStartingBalance = await accounts[1].getBalance()
                await vrfCoordinatorV2Mock.fulfillRandomWords(txReceipt.events[1].args.requestId, raffle.address)
            })
        })

    })




    console.log("But did I get this far?")

})