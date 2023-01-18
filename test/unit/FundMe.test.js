const { assert, expect } = require("chai")
const { deployments, ethers, getNamedAccounts, network } = require("hardhat")
const { send } = require("process")
const { developmentChains } = require("../../helper-hardhat-config.js")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", async function () {
          let fundMe
          let deployer
          let mockV3Aggregator
          const sendValue = ethers.utils.parseEther("1")
          beforeEach(async function () {
              // const accounts = await ethers.getSigners()
              // const accountZero = accounts[0]
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              // gice us most recently deployed contract
              fundMe = await ethers.getContract("FundMe", deployer)
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })

          // test just for the constructor
          describe("constructor", async function () {
              it("sets the aggregator correctly", async function () {
                  const response = await fundMe.getPriceFeed()
                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          describe("fund", async function () {
              it("Fail if you don't send enough ETH", async function () {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "You need to spend more ETH!"
                  )
              })
              it("update the amount funded data structure", async function () {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getAddressToAmountFunded(
                      deployer
                  )
                  assert.equal(response.toString(), sendValue.toString())
              })
              it("adds funder to array of getFunder", async function () {
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.getFunder(0)
                  assert.equal(funder, deployer)
              })
          })
          describe("withdraw", async function () {
              beforeEach(async function () {
                  await fundMe.fund({ value: sendValue })
              })

              it("withdraw ETH from a single funder", async function () {
                  //arrange
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  //act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)
                  const { effectiveGasPrice, gasUsed } = transactionReceipt
                  const gasCost = effectiveGasPrice.mul(gasUsed)
                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  //assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })
              it("allows us to withdraw with multiple getFunder", async function () {
                  // arrange

                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)
                  const { effectiveGasPrice, gasUsed } = transactionReceipt
                  const gasCost = effectiveGasPrice.mul(gasUsed)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  // assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )

                  // make sure getFunder are reset properly
                  await expect(fundMe.getFunder(0)).to.be.reverted

                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })
              it("only owner allows to withdraw", async function () {
                  const accounts = await ethers.getSigners()
                  const attacker = accounts[1]
                  const attackerConnectedContract = await fundMe.connect(
                      attacker
                  )
                  await expect(
                      attackerConnectedContract.withdraw()
                  ).to.be.revertedWith("FundMe__NotOwner")
              })
          })
          it("cheaperWithdraw testing...", async function () {
              // arrange

              const accounts = await ethers.getSigners()
              for (let i = 1; i < 6; i++) {
                  const fundMeConnectedContract = await fundMe.connect(
                      accounts[i]
                  )
                  await fundMeConnectedContract.fund({ value: sendValue })
              }
              const startingFundMeBalance = await fundMe.provider.getBalance(
                  fundMe.address
              )
              const startingDeployerBalance = await fundMe.provider.getBalance(
                  deployer
              )

              const transactionResponse = await fundMe.cheaperWithdraw()
              const transactionReceipt = await transactionResponse.wait(1)
              const { effectiveGasPrice, gasUsed } = transactionReceipt
              const gasCost = effectiveGasPrice.mul(gasUsed)

              const endingFundMeBalance = await fundMe.provider.getBalance(
                  fundMe.address
              )
              const endingDeployerBalance = await fundMe.provider.getBalance(
                  deployer
              )
              // assert
              assert.equal(endingFundMeBalance, 0)
              assert.equal(
                  startingFundMeBalance.add(startingDeployerBalance).toString(),
                  endingDeployerBalance.add(gasCost).toString()
              )

              // make sure getFunder are reset properly
              await expect(fundMe.getFunder(0)).to.be.reverted

              for (i = 1; i < 6; i++) {
                  assert.equal(
                      await fundMe.getAddressToAmountFunded(
                          accounts[i].address
                      ),
                      0
                  )
              }
          })
          it("withdraw ETH from a single funder", async function () {
              //arrange
              const startingFundMeBalance = await fundMe.provider.getBalance(
                  fundMe.address
              )
              const startingDeployerBalance = await fundMe.provider.getBalance(
                  deployer
              )
              //act
              const transactionResponse = await fundMe.cheaperWithdraw()
              const transactionReceipt = await transactionResponse.wait(1)
              const { effectiveGasPrice, gasUsed } = transactionReceipt
              const gasCost = effectiveGasPrice.mul(gasUsed)
              const endingFundMeBalance = await fundMe.provider.getBalance(
                  fundMe.address
              )
              const endingDeployerBalance = await fundMe.provider.getBalance(
                  deployer
              )
              //assert
              assert.equal(endingFundMeBalance, 0)
              assert.equal(
                  startingFundMeBalance.add(startingDeployerBalance).toString(),
                  endingDeployerBalance.add(gasCost).toString()
              )
          })
      })
