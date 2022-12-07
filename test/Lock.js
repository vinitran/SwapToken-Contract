const { expect } = require("chai");
const { ethers } = require("hardhat");
const fromWei = (value) => {
    return Number(ethers.utils.formatEther(value));
}

const toWei = (value) => {
    return ethers.utils.parseUnits(value.toString(), "ether");
}
describe("Swap", async function () {
    const supplyToken = 5 * 10 ** 9;
    const nativeTokenAddr = "0x0000000000000000000000000000000000000000";
    let vinh, ice, swap,swapV2, deployer, addr1, addr2
    beforeEach(async function () {
        const TOKEN = await ethers.getContractFactory("Token");
        const SWAP = await ethers.getContractFactory("Swap");
        const SWAPV2 = await ethers.getContractFactory("SwapV2");
        [deployer, addr1, addr2] = await ethers.getSigners();
        vinh = await upgrades.deployProxy(TOKEN, ["Vinh", "VINH", toWei(supplyToken)], {
            initializer: "initialize",
        });
        ice = await upgrades.deployProxy(TOKEN, ["Ice", "ICE", toWei(supplyToken)], {
            initializer: "initialize",
        });
        
        swap = await upgrades.deployProxy(SWAP, [], {
            initializer: "initialize",
        });

        await vinh.deployed();
        await ice.deployed();
        await swap.deployed();

        // await upgrades.upgradeProxy(swap.address, SWAPV2);

        await vinh.connect(deployer).transfer(addr1.address, toWei(5 * 10 ** 6));
        await ice.connect(deployer).transfer(addr1.address, toWei(5 * 10 ** 6));
        await vinh.connect(deployer).approve(swap.address, toWei(supplyToken));
        await ice.connect(deployer).approve(swap.address, toWei(supplyToken));
        await vinh.connect(addr1).approve(swap.address, toWei(supplyToken));
        await ice.connect(addr1).approve(swap.address, toWei(supplyToken));
    });

    describe("Check set Rate function success", function () {
        const rate = 1638370;
        const digits = 20;
        const check = async (token1Addr, token2Addr) => {
            await swap.connect(deployer).setRate(token1Addr, token2Addr, rate, digits);
            const rate1 = await swap.rate(token1Addr, token2Addr);
            const rate2 = await swap.rate(token2Addr, token1Addr);
            expect(Number(rate1.value)).to.equal(rate);
            expect(Number(rate1.digits)).to.equal(digits);
            expect(Number(rate2.value)).to.equal(Number(10 ** (2 * digits) / rate).toFixed(0) - 1);
            expect(Number(rate2.digits)).to.equal(digits);
        }

        it("Check set Rate function with token => token success", async function () {
            check(vinh.address, ice.address);
        })

        it("Check set Rate function with token => native token success", async function () {
            check(vinh.address, nativeTokenAddr);
        })

        it("Check set Rate function with native token => token success", async function () {
            check(nativeTokenAddr, ice.address);
        })
    })

    describe("Check set Rate function fail", async function () {
        const rate = 1638370;
        const digits = 20;
        it("msg.sender isn't owner", async function () {
            await expect(swap.connect(addr1).setRate(vinh.address, ice.address, rate, digits)).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(swap.connect(addr2).setRate(vinh.address, ice.address, rate, digits)).to.be.revertedWith("Ownable: caller is not the owner");
        })
    });

    describe("Check deposit token function success", async function () {
        const depositAmount = 300;

        it("Deposit token (Except native token)", async function () {
            await swap.connect(deployer).depositToken(vinh.address, toWei(depositAmount));
            expect(Number(fromWei(await vinh.balanceOf(swap.address)))).to.equal(depositAmount);
        })

        it("Deposit native token", async function () {
            const balanceDeployerInit = Number(fromWei(await ethers.provider.getBalance(deployer.address))).toFixed(2);
            const balanceSwapInit = Number(fromWei(await ethers.provider.getBalance(swap.address))).toFixed(2);

            await swap.connect(deployer).depositToken(nativeTokenAddr, toWei(depositAmount), { value: toWei(depositAmount) });

            const balanceDeployerFinal = Number(fromWei(await ethers.provider.getBalance(deployer.address))).toFixed(2);
            const balanceSwapFinal = Number(fromWei(await ethers.provider.getBalance(swap.address))).toFixed(2);

            expect(Number(balanceDeployerFinal)).to.equal(Number(balanceDeployerInit) - Number(depositAmount));
            expect(Number(balanceSwapFinal)).to.equal(Number(balanceSwapInit) + Number(depositAmount));
        })
    });

    describe("Check deposit token function fail", async function () {
        const depositAmount = 300;

        it("Deposit token (Except native token)", async function () {
            await expect(swap.connect(addr1).depositToken(vinh.address, toWei(depositAmount))).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(swap.connect(addr2).depositToken(vinh.address, toWei(depositAmount))).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("Deposit native token", async function () {
            await expect(swap.connect(addr1).depositToken(nativeTokenAddr, toWei(depositAmount), { value: toWei(depositAmount) })).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(swap.connect(addr2).depositToken(nativeTokenAddr, toWei(depositAmount), { value: toWei(depositAmount) })).to.be.revertedWith("Ownable: caller is not the owner");
        })
    })

    describe("Check withdraw token function success", async function () {
        const depositAmount = 10;
        const withdrawAmount = 5;

        beforeEach(async function () {
            await swap.connect(deployer).depositToken(nativeTokenAddr, toWei(depositAmount), { value: toWei(depositAmount) });
            await swap.connect(deployer).depositToken(vinh.address, toWei(depositAmount));
        })

        it("Withdraw token (Except native token)", async function () {
            const balanceDeployerInit = Number(fromWei(await vinh.balanceOf(deployer.address)));
            const balanceSwapInit = Number(fromWei(await vinh.balanceOf(swap.address)));

            await swap.connect(deployer).withdraw(vinh.address, toWei(withdrawAmount));

            const balanceSwapFinal = Number(fromWei(await vinh.balanceOf(swap.address)));
            const balanceDeployerFinal = Number(fromWei(await vinh.balanceOf(deployer.address)));

            expect(balanceDeployerFinal).to.equal(balanceDeployerInit + withdrawAmount);
            expect(balanceSwapFinal).to.equal(balanceSwapInit - withdrawAmount);
        })

        it("Withdraw native token", async function () {
            const balanceDeployerInit = Number(fromWei(await ethers.provider.getBalance(deployer.address))).toFixed(2);
            const balanceSwapInit = Number(fromWei(await ethers.provider.getBalance(swap.address))).toFixed(2);

            await swap.connect(deployer).withdraw(nativeTokenAddr, toWei(withdrawAmount));

            const balanceDeployerFinal = Number(fromWei(await ethers.provider.getBalance(deployer.address))).toFixed(2);
            const balanceSwapFinal = Number(fromWei(await ethers.provider.getBalance(swap.address))).toFixed(2);
            expect(Number(balanceDeployerFinal)).to.equal(Number(balanceDeployerInit) + Number(withdrawAmount));
            expect(Number(balanceSwapFinal)).to.equal(Number(balanceSwapInit) - Number(withdrawAmount));
        })
    })

    describe("Check withdraw token function success", async function () {
        const depositAmount = 10;
        const withdrawAmount = 5;

        beforeEach(async function () {
            await swap.connect(deployer).depositToken(nativeTokenAddr, toWei(depositAmount), { value: toWei(depositAmount) });
            await swap.connect(deployer).depositToken(vinh.address, toWei(depositAmount));
        })

        it("Withdraw token (Except native token)", async function () {
            await expect(swap.connect(addr1).withdraw(vinh.address, toWei(withdrawAmount))).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(swap.connect(addr2).withdraw(vinh.address, toWei(withdrawAmount))).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("Withdraw native token", async function () {
            await expect(swap.connect(addr1).withdraw(nativeTokenAddr, toWei(withdrawAmount))).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(swap.connect(addr2).withdraw(nativeTokenAddr, toWei(withdrawAmount))).to.be.revertedWith("Ownable: caller is not the owner");
        })
    })

    describe("Check swap token function success", async function () {
        const depositAmount = 100;
        const rateVinhToIceValue = 2.5 * 10 ** 6;
        const rateVinhToIceDecimal = 6;
        const rateVinhToNativeValue = 1.5 * 10 ** 6;
        const rateVinhToNativeDecimal = 6;
        const tokenInAmount = 10;
        beforeEach(async function () {
            //Set Rate
            await swap.connect(deployer).setRate(vinh.address, ice.address, rateVinhToIceValue, rateVinhToIceDecimal);
            await swap.connect(deployer).setRate(vinh.address, nativeTokenAddr, rateVinhToNativeValue, rateVinhToNativeDecimal);
            //Add Pool
            await swap.connect(deployer).depositToken(nativeTokenAddr, toWei(depositAmount), { value: toWei(depositAmount) });
            await swap.connect(deployer).depositToken(vinh.address, toWei(depositAmount));
            await swap.connect(deployer).depositToken(ice.address, toWei(depositAmount));
        })

        it("Swap token to token", async function () {
            const tokenOutAmount = tokenInAmount * rateVinhToIceValue / (10 ** rateVinhToIceDecimal);
            const balanceVinhAddr1Init = Number(fromWei(await vinh.balanceOf(addr1.address)));
            const balanceIceAddr1Init = Number(fromWei(await ice.balanceOf(addr1.address)));

            const balanceVinhSwapInit = Number(fromWei(await vinh.balanceOf(swap.address)));
            const balanceIceSwapInit = Number(fromWei(await ice.balanceOf(swap.address)));

            await swap.connect(addr1).swap(vinh.address, ice.address, toWei(tokenInAmount));

            const balanceVinhAddr1Final = Number(fromWei(await vinh.balanceOf(addr1.address)));
            const balanceIceAddr1Final = Number(fromWei(await ice.balanceOf(addr1.address)));

            const balanceVinhSwapFinal = Number(fromWei(await vinh.balanceOf(swap.address)));
            const balanceIceSwapFinal = Number(fromWei(await ice.balanceOf(swap.address)));

            //check balance in contract
            expect(balanceVinhSwapInit).to.equal(balanceVinhSwapFinal - tokenInAmount)
            expect(balanceIceSwapInit).to.equal(balanceIceSwapFinal + tokenOutAmount)
            //check balance in wallet
            expect(balanceVinhAddr1Init).to.equal(balanceVinhAddr1Final + tokenInAmount)
            expect(balanceIceAddr1Init).to.equal(balanceIceAddr1Final - tokenOutAmount)
        })

        it("Swap token to native token", async function () {
            const tokenOutAmount = tokenInAmount * rateVinhToNativeValue / (10 ** rateVinhToNativeDecimal);
            const balanceVinhAddr1Init = Number(fromWei(await vinh.balanceOf(addr1.address)));
            const balanceEtherAddr1Init = Number(fromWei(await ethers.provider.getBalance(addr1.address))).toFixed(2)

            const balanceVinhSwapInit = Number(fromWei(await vinh.balanceOf(swap.address)));
            const balanceEtherSwapInit = Number(fromWei(await ethers.provider.getBalance(swap.address))).toFixed(2);

            await swap.connect(addr1).swap(vinh.address, nativeTokenAddr, toWei(tokenInAmount));

            const balanceVinhAddr1Final = Number(fromWei(await vinh.balanceOf(addr1.address)));
            const balanceEtherAddr1Final = Number(fromWei(await ethers.provider.getBalance(addr1.address))).toFixed(2)

            const balanceVinhSwapFinal = Number(fromWei(await vinh.balanceOf(swap.address)));
            const balanceEtherSwapFinal = Number(fromWei(await ethers.provider.getBalance(swap.address))).toFixed(2);

            expect(balanceVinhAddr1Init).to.equal(balanceVinhAddr1Final + tokenInAmount)
            expect(Number(balanceEtherAddr1Init)).to.equal(Number(balanceEtherAddr1Final) - Number(tokenOutAmount))

            expect(balanceVinhSwapInit).to.equal(balanceVinhSwapFinal - tokenInAmount)
            expect(Number(balanceEtherSwapInit)).to.equal(Number(balanceEtherSwapFinal) + Number(tokenOutAmount))
        })

        it("Swap native token to token", async function () {
            const tokenOutAmount = tokenInAmount * (10 ** rateVinhToNativeDecimal) / (rateVinhToNativeValue);
            const balanceVinhAddr1Init = Number(fromWei(await vinh.balanceOf(addr1.address)));
            const balanceEtherAddr1Init = Number(fromWei(await ethers.provider.getBalance(addr1.address))).toFixed(2)

            const balanceVinhSwapInit = Number(fromWei(await vinh.balanceOf(swap.address)));
            const balanceEtherSwapInit = Number(fromWei(await ethers.provider.getBalance(swap.address))).toFixed(2);

            await swap.connect(addr1).swap(nativeTokenAddr, vinh.address, toWei(tokenInAmount), { value: toWei(tokenInAmount) });

            const balanceVinhAddr1Final = Number(fromWei(await vinh.balanceOf(addr1.address)));
            const balanceEtherAddr1Final = Number(fromWei(await ethers.provider.getBalance(addr1.address))).toFixed(2)
            const balanceVinhSwapFinal = Number(fromWei(await vinh.balanceOf(swap.address)));
            const balanceEtherSwapFinal = Number(fromWei(await ethers.provider.getBalance(swap.address))).toFixed(2);

            expect(balanceVinhAddr1Init).to.equal(Number(Number(balanceVinhAddr1Final - tokenOutAmount).toFixed(4)))
            expect(Number(balanceEtherAddr1Init)).to.equal(Number(balanceEtherAddr1Final) + tokenInAmount)

            expect(balanceVinhSwapInit).to.equal((Number(Number(balanceVinhSwapFinal + tokenOutAmount).toFixed(4))))
            expect(Number(balanceEtherSwapInit)).to.equal(Number(balanceEtherSwapFinal) - tokenInAmount)
        })
    })

    describe("Check swap token function fail", async function () {
        const depositAmount = 100;
        const rateVinhToIceValue = 2.5 * 10 ** 6;
        const rateVinhToIceDecimal = 6;
        const rateVinhToNativeValue = 1.5 * 10 ** 6;
        const rateVinhToNativeDecimal = 6;
        beforeEach(async function () {
            //Set Rate
            await swap.connect(deployer).setRate(vinh.address, ice.address, rateVinhToIceValue, rateVinhToIceDecimal);
            await swap.connect(deployer).setRate(vinh.address, nativeTokenAddr, rateVinhToNativeValue, rateVinhToNativeDecimal);
            //Add Pool
            await swap.connect(deployer).depositToken(nativeTokenAddr, toWei(depositAmount), { value: toWei(depositAmount) });
            await swap.connect(deployer).depositToken(vinh.address, toWei(depositAmount));
            await swap.connect(deployer).depositToken(ice.address, toWei(depositAmount));
        })

        it("Swap token to token", async function () {
            await expect(swap.connect(addr1).swap(vinh.address, ice.address, 0)).to.be.revertedWith("Amount must be greater than 0");
            await expect(swap.connect(addr1).swap(vinh.address, ice.address, toWei(depositAmount + 1))).to.be.revertedWith("ERC20: transfer amount exceeds balance");
        })

        it("Swap token to native token", async function () {
            await expect(swap.connect(addr1).swap(vinh.address, nativeTokenAddr, 0)).to.be.revertedWith("Amount must be greater than 0");
            await expect(swap.connect(addr1).swap(vinh.address, nativeTokenAddr, toWei(depositAmount))).to.be.revertedWith("Failed to send Ether");
        })

        it("Swap native token to token", async function () {
            await expect(swap.connect(addr1).swap(nativeTokenAddr, ice.address, 0, { value: 0 })).to.be.revertedWith("Amount must be greater than 0");
            await expect(swap.connect(addr1).swap(nativeTokenAddr, vinh.address, toWei(10 * depositAmount), { value: toWei(10 * depositAmount) })).to.be.revertedWith("ERC20: transfer amount exceeds balance");
        })
    })
})