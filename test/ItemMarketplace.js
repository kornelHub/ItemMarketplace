const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ItemMarketplace Tests", function () {
  const addressZero = ethers.constants.AddressZero;
  const itemDescription = "LorepIpsu";

  const activeStatusId = 0;
  const payedStatusId = 1;
  const sendStatusId = 2;
  const receivedStatusId = 3;
  const cancelledStatusId = 4;
  const disputUnresolvedStatusId = 5;
  const disputResolvedSellerStatusId = 6;
  const disputResolvedBuyerStatusId = 7;

  async function deployMarketplaceFixture() {
    const [disputResolver, seller, buyer, notRelatedAcc, ...acc] = await ethers.getSigners();

    const ItemMarketplace = await ethers.getContractFactory("ItemMarketplace");
    const marketplace = await ItemMarketplace.deploy();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockErc20 = await MockERC20.deploy();

    return { marketplace, mockErc20, disputResolver, seller, buyer, notRelatedAcc, acc };
  }

  // Returns random token value for a token with 18 decimal places that ranges between 1000 and 0.0001
  async function getRandomTokenNumber() {
    const randNum = Math.random() * 100000;
    return ethers.utils.parseUnits(randNum.toString(), 18);
  }

  describe("ItemMarketplace", function () {
    describe("createSale()", function () {
      it("PASS", async function () {
        const { marketplace, mockErc20, seller } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;

        await expect(marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription))
          .to.emit(marketplace, "SaleCreated")
          .withArgs(saleId, seller.address, price, mockErc20.address, itemDescription);

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[0]).to.be.equal(seller.address);
        expect(saleOffer[1]).to.be.equal(price);
        expect(saleOffer[2]).to.be.equal(mockErc20.address);
        expect(saleOffer[3]).to.be.equal(activeStatusId);
        expect(saleOffer[4]).to.be.equal(itemDescription);
        expect(saleOffer[5]).to.be.equal(addressZero);
      });

      it("FAIL - price 0", async function () {
        const { marketplace, mockErc20, seller } = await loadFixture(deployMarketplaceFixture);
        const price = 0;
        const saleId = 0;

        await expect(
          marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription)
        ).to.be.revertedWith("E#6");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[0]).to.be.equal(addressZero);
        expect(saleOffer[1]).to.be.equal(price);
        expect(saleOffer[2]).to.be.equal(addressZero);
        expect(saleOffer[3]).to.be.equal(activeStatusId);
        expect(saleOffer[4]).to.be.equal("");
        expect(saleOffer[5]).to.be.equal(addressZero);
      });
    });

    describe("cancelSale()", function () {
      it("PASS", async function () {
        const { marketplace, mockErc20, seller } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);

        await expect(marketplace.connect(seller).cancelSale(saleId))
          .to.emit(marketplace, "SaleCancelled")
          .withArgs(saleId);

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(cancelledStatusId);
      });

      it("FAIL - not owner of sale", async function () {
        const { marketplace, mockErc20, seller, notRelatedAcc } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await expect(marketplace.connect(notRelatedAcc).cancelSale(saleId)).to.be.revertedWith("E#0");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(activeStatusId);
      });

      it("FAIL - invalid sale state. Is CANCELLED, should be ACTIVE", async function () {
        const { marketplace, mockErc20, seller } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await marketplace.connect(seller).cancelSale(saleId);
        await expect(marketplace.connect(seller).cancelSale(saleId)).to.be.revertedWith("E#2");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(cancelledStatusId);
      });
    });

    describe("modifySalePrice()", function () {
      it("PASS", async function () {
        const { marketplace, mockErc20, seller } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const newPrice = await getRandomTokenNumber();

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);

        await expect(marketplace.connect(seller).modifySalePrice(saleId, newPrice))
          .to.emit(marketplace, "SalePriceUpdated")
          .withArgs(saleId, price, newPrice, mockErc20.address);

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[1]).to.be.equal(newPrice);
      });

      it("FAIL - not owner of sale", async function () {
        const { marketplace, mockErc20, seller, notRelatedAcc } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const newPrice = await getRandomTokenNumber();

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await expect(marketplace.connect(notRelatedAcc).modifySalePrice(saleId, newPrice)).to.be.revertedWith("E#0");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[1]).to.be.equal(price);
      });

      it("FAIL - price 0", async function () {
        const { marketplace, mockErc20, seller } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const newPrice = 0;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await expect(marketplace.connect(seller).modifySalePrice(saleId, newPrice)).to.be.revertedWith("E#6");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[1]).to.be.equal(price);
      });

      it("FAIL - invalid sale state. Is CANCELLED, should be ACTIVE", async function () {
        const { marketplace, mockErc20, seller } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const newPrice = await getRandomTokenNumber();

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await marketplace.connect(seller).cancelSale(saleId);
        await expect(marketplace.connect(seller).modifySalePrice(saleId, newPrice)).to.be.revertedWith("E#2");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[1]).to.be.equal(price);
      });
    });

    describe("buyItemOnSale()", function () {
      it("PASS", async function () {
        const { marketplace, mockErc20, seller, buyer } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);

        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);

        await expect(marketplace.connect(buyer).buyItemOnSale(saleId))
          .to.emit(marketplace, "ItemBought")
          .withArgs(saleId, price, mockErc20.address, buyer.address);

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(payedStatusId);
        expect(saleOffer[5]).to.be.equal(buyer.address);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(price);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equals(price);
      });

      it("FAIL - invalid sale state. Is CANCELLED, should be ACTIVE", async function () {
        const { marketplace, mockErc20, seller, buyer } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await marketplace.connect(seller).cancelSale(saleId);

        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);

        await expect(marketplace.connect(buyer).buyItemOnSale(saleId)).to.be.revertedWith("E#2");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(cancelledStatusId);
        expect(saleOffer[5]).to.be.equal(addressZero);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(buyer.address)).to.be.equal(price);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equals(0);
      });
    });

    describe("confirmSendingItem()", function () {
      it("PASS", async function () {
        const { marketplace, mockErc20, seller, buyer } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);

        await expect(marketplace.connect(seller).confirmSendingItem(saleId))
          .to.emit(marketplace, "ItemSend")
          .withArgs(saleId);

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(sendStatusId);
      });

      it("FAIL - not owner of sale", async function () {
        const { marketplace, mockErc20, seller, buyer, notRelatedAcc } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);

        await expect(marketplace.connect(notRelatedAcc).confirmSendingItem(saleId)).to.be.rejectedWith("E#0");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(payedStatusId);
      });

      it("FAIL - invalid sale state. Is CANCELLED, should be PAYED", async function () {
        const { marketplace, mockErc20, seller, buyer } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(seller).cancelSale(saleId);

        await expect(marketplace.connect(seller).confirmSendingItem(saleId)).to.be.revertedWith("E#3");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(cancelledStatusId);
      });

      it("FAIL - invalid sale state. Is ACTIVE, should be PAYED", async function () {
        const { marketplace, mockErc20, seller, buyer } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);

        await expect(marketplace.connect(seller).confirmSendingItem(saleId)).to.be.revertedWith("E#3");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(activeStatusId);
      });
    });

    describe("confirmReceivingItem()", function () {
      it("PASS", async function () {
        const { marketplace, mockErc20, seller, buyer } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        await marketplace.connect(seller).confirmSendingItem(saleId);
        const tvlBefor = await marketplace.addressToTvl(mockErc20.address);

        await expect(marketplace.connect(buyer).confirmReceivingItem(saleId))
          .to.emit(marketplace, "ItemReceived")
          .withArgs(saleId);

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(receivedStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(price);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(0);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equal(tvlBefor - price);
      });

      it("FAIL - not buyer", async function () {
        const { marketplace, mockErc20, seller, buyer, notRelatedAcc } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        await marketplace.connect(seller).confirmSendingItem(saleId);
        const tvlBefor = await marketplace.addressToTvl(mockErc20.address);

        await expect(marketplace.connect(notRelatedAcc).confirmReceivingItem(saleId)).to.be.revertedWith("E#4");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(sendStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(price);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equal(tvlBefor);
      });

      it("FAIL - invalid sale state. Is PAYED, should be SEND", async function () {
        const { marketplace, mockErc20, seller, buyer } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        const tvlBefor = await marketplace.addressToTvl(mockErc20.address);

        await expect(marketplace.connect(buyer).confirmReceivingItem(saleId)).to.be.revertedWith("E#5");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(payedStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(price);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equal(tvlBefor);
      });
    });

    describe("reportProblem()", function () {
      it("PASS - buyer", async function () {
        const { marketplace, mockErc20, seller, buyer } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const problemDescription = "Problem description";

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        await marketplace.connect(seller).confirmSendingItem(saleId);

        await expect(marketplace.connect(buyer).reportProblem(saleId, problemDescription))
          .to.emit(marketplace, "DisputeCreated")
          .withArgs(saleId);

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(disputUnresolvedStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(price);
        expect(await marketplace.saleIdToDisputeReason(saleId)).to.be.equal(problemDescription);
      });

      it("PASS - seller", async function () {
        const { marketplace, mockErc20, seller, buyer } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const problemDescription = "Problem description";

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        await marketplace.connect(seller).confirmSendingItem(saleId);

        await expect(marketplace.connect(seller).reportProblem(saleId, problemDescription))
          .to.emit(marketplace, "DisputeCreated")
          .withArgs(saleId);

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(disputUnresolvedStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(price);
        expect(await marketplace.saleIdToDisputeReason(saleId)).to.be.equal(problemDescription);
      });

      it("FAIL - not buyer", async function () {
        const { marketplace, mockErc20, seller, buyer, notRelatedAcc } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const problemDescription = "Problem description";

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        await marketplace.connect(seller).confirmSendingItem(saleId);

        await expect(marketplace.connect(notRelatedAcc).reportProblem(saleId, problemDescription)).to.be.revertedWith(
          "E#8"
        );

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(sendStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(price);
        expect(await marketplace.saleIdToDisputeReason(saleId)).to.be.equal("");
      });

      it("FAIL - invalid sale state. Is ACTIVE, should be SEND", async function () {
        const { marketplace, mockErc20, seller, buyer } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const problemDescription = "Problem description";

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);

        await expect(marketplace.connect(buyer).reportProblem(saleId, problemDescription)).to.be.revertedWith("E#5");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(activeStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(0);
        expect(await marketplace.saleIdToDisputeReason(saleId)).to.be.equal("");
      });

      it("FAIL - invalid sale state. Is CANCELLED, should be SEND", async function () {
        const { marketplace, mockErc20, seller, buyer } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const problemDescription = "Problem description";

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await marketplace.connect(seller).cancelSale(saleId);

        await expect(marketplace.connect(buyer).reportProblem(saleId, problemDescription)).to.be.revertedWith("E#5");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(cancelledStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(0);
        expect(await marketplace.saleIdToDisputeReason(saleId)).to.be.equal("");
      });

      it("FAIL - invalid sale state. Is PAYED, should be SEND", async function () {
        const { marketplace, mockErc20, seller, buyer } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const problemDescription = "Problem description";

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);

        await expect(marketplace.connect(buyer).reportProblem(saleId, problemDescription)).to.be.revertedWith("E#5");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(payedStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(price);
        expect(await marketplace.saleIdToDisputeReason(saleId)).to.be.equal("");
      });

      it("FAIL - invalid sale state. Is RECEIVED, should be SEND", async function () {
        const { marketplace, mockErc20, seller, buyer } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const problemDescription = "Problem description";

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        await marketplace.connect(seller).confirmSendingItem(saleId);
        await marketplace.connect(buyer).confirmReceivingItem(saleId);

        await expect(marketplace.connect(buyer).reportProblem(saleId, problemDescription)).to.be.revertedWith("E#5");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(receivedStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(price);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(0);
        expect(await marketplace.saleIdToDisputeReason(saleId)).to.be.equal("");
      });

      it("FAIL - invalid sale state. Is DISPUT_RESOLVED_SELLER, should be SEND", async function () {
        const { marketplace, mockErc20, seller, buyer, disputResolver } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const problemDescription = "Problem description";
        const isBuyerRigth = false;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        await marketplace.connect(seller).confirmSendingItem(saleId);
        await marketplace.connect(buyer).reportProblem(saleId, problemDescription);
        await marketplace.connect(disputResolver).resolveDispute(saleId, isBuyerRigth);

        await expect(marketplace.connect(buyer).reportProblem(saleId, problemDescription)).to.be.revertedWith("E#5");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(disputResolvedSellerStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(price);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(buyer.address)).to.be.equal(0);
      });

      it("FAIL - invalid sale state. Is DISPUT_RESOLVED_BUYER, should be SEND", async function () {
        const { marketplace, mockErc20, seller, buyer, disputResolver } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const problemDescription = "Problem description";
        const isBuyerRigth = true;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        await marketplace.connect(seller).confirmSendingItem(saleId);
        await marketplace.connect(buyer).reportProblem(saleId, problemDescription);
        await marketplace.connect(disputResolver).resolveDispute(saleId, isBuyerRigth);

        await expect(marketplace.connect(buyer).reportProblem(saleId, problemDescription)).to.be.revertedWith("E#5");

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(disputResolvedBuyerStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(buyer.address)).to.be.equal(price);
      });
    });

    describe("resolveDispute()", function () {
      it("PASS - buyer rigth", async function () {
        const { marketplace, mockErc20, seller, buyer, disputResolver } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const problemDescription = "Problem description";
        const isBuyerRigth = true;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        await marketplace.connect(seller).confirmSendingItem(saleId);
        await marketplace.connect(buyer).reportProblem(saleId, problemDescription);
        const tvlBefor = await marketplace.addressToTvl(mockErc20.address);

        await expect(marketplace.connect(disputResolver).resolveDispute(saleId, isBuyerRigth))
          .to.emit(marketplace, "DisputeResolved")
          .withArgs(saleId, isBuyerRigth);

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(disputResolvedBuyerStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(buyer.address)).to.be.equal(price);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equals(tvlBefor - price);
      });

      it("PASS - seller rigth", async function () {
        const { marketplace, mockErc20, seller, buyer, disputResolver } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const problemDescription = "Problem description";
        const isBuyerRigth = false;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        await marketplace.connect(seller).confirmSendingItem(saleId);
        await marketplace.connect(buyer).reportProblem(saleId, problemDescription);
        const tvlBefor = await marketplace.addressToTvl(mockErc20.address);

        await expect(marketplace.connect(disputResolver).resolveDispute(saleId, isBuyerRigth))
          .to.emit(marketplace, "DisputeResolved")
          .withArgs(saleId, isBuyerRigth);

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(disputResolvedSellerStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(price);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(buyer.address)).to.be.equal(0);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equals(tvlBefor - price);
      });

      it("FAIL - not DISPUTE_RESOLUTIONER role", async function () {
        const { marketplace, mockErc20, seller, buyer, notRelatedAcc } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const problemDescription = "Problem description";
        const isBuyerRigth = true;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        await marketplace.connect(seller).confirmSendingItem(saleId);
        await marketplace.connect(buyer).reportProblem(saleId, problemDescription);
        const tvlBefor = await marketplace.addressToTvl(mockErc20.address);

        await expect(marketplace.connect(notRelatedAcc).resolveDispute(saleId, isBuyerRigth)).to.be.revertedWith(
          `AccessControl: account ${notRelatedAcc.address.toLowerCase()} is missing role 0x04b2e9c49e7cff5fc464df48a3f1fb7299d451e12c8df4f082ac75d85365b6f7`
        );

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(disputUnresolvedStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(price);
        expect(await mockErc20.balanceOf(buyer.address)).to.be.equal(0);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equals(tvlBefor);
      });

      it("FAIL - invalid sale state. Is ACTIVE, should be DISPUT_UNRESOLVED", async function () {
        const { marketplace, mockErc20, seller, buyer, disputResolver } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const isBuyerRigth = true;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        const tvlBefor = await marketplace.addressToTvl(mockErc20.address);

        await expect(marketplace.connect(disputResolver).resolveDispute(saleId, isBuyerRigth)).to.be.revertedWith(
          "E#7"
        );

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(activeStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(buyer.address)).to.be.equal(0);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equals(tvlBefor);
      });

      it("FAIL - invalid sale state. Is CANCELLED, should be DISPUT_UNRESOLVED", async function () {
        const { marketplace, mockErc20, seller, buyer, disputResolver } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const isBuyerRigth = true;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await marketplace.connect(seller).cancelSale(saleId);
        const tvlBefor = await marketplace.addressToTvl(mockErc20.address);

        await expect(marketplace.connect(disputResolver).resolveDispute(saleId, isBuyerRigth)).to.be.revertedWith(
          "E#7"
        );

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(cancelledStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(buyer.address)).to.be.equal(0);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equals(tvlBefor);
      });

      it("FAIL - invalid sale state. Is PAYED, should be DISPUT_UNRESOLVED", async function () {
        const { marketplace, mockErc20, seller, buyer, disputResolver } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const isBuyerRigth = true;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        const tvlBefor = await marketplace.addressToTvl(mockErc20.address);

        await expect(marketplace.connect(disputResolver).resolveDispute(saleId, isBuyerRigth)).to.be.revertedWith(
          "E#7"
        );

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(payedStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(price);
        expect(await mockErc20.balanceOf(buyer.address)).to.be.equal(0);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equals(tvlBefor);
      });

      it("FAIL - invalid sale state. Is SEND, should be DISPUT_UNRESOLVED", async function () {
        const { marketplace, mockErc20, seller, buyer, disputResolver } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const isBuyerRigth = true;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        await marketplace.connect(seller).confirmSendingItem(saleId);
        const tvlBefor = await marketplace.addressToTvl(mockErc20.address);

        await expect(marketplace.connect(disputResolver).resolveDispute(saleId, isBuyerRigth)).to.be.revertedWith(
          "E#7"
        );

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(sendStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(price);
        expect(await mockErc20.balanceOf(buyer.address)).to.be.equal(0);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equals(tvlBefor);
      });

      it("FAIL - invalid sale state. Is RECEIVED, should be DISPUT_UNRESOLVED", async function () {
        const { marketplace, mockErc20, seller, buyer, disputResolver } = await loadFixture(deployMarketplaceFixture);
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const isBuyerRigth = true;

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);
        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        await marketplace.connect(seller).confirmSendingItem(saleId);
        await marketplace.connect(buyer).confirmReceivingItem(saleId);
        const tvlBefor = await marketplace.addressToTvl(mockErc20.address);

        await expect(marketplace.connect(disputResolver).resolveDispute(saleId, isBuyerRigth)).to.be.revertedWith(
          "E#7"
        );

        const saleOffer = await marketplace.saleIdToSale(saleId);
        expect(saleOffer[3]).to.be.equal(receivedStatusId);
        expect(await mockErc20.balanceOf(seller.address)).to.be.equal(price);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(0);
        expect(await mockErc20.balanceOf(buyer.address)).to.be.equal(0);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equals(tvlBefor);
      });
    });

    describe("receive()", function () {
      it("PASS", async function () {
        const { marketplace, acc } = await loadFixture(deployMarketplaceFixture);
        const ethAmount = await getRandomTokenNumber();

        await expect(
          acc[0].sendTransaction({
            to: marketplace.address,
            data: "0x",
            value: ethAmount,
          })
        ).to.be.revertedWith("E#9");
      });
    });

    describe("withdrawRedundantTokens()", function () {
      it("PASS", async function () {
        const { marketplace, mockErc20, seller, buyer, notRelatedAcc, disputResolver } = await loadFixture(
          deployMarketplaceFixture
        );
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const priceNumber = BigInt(price);

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);

        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        await mockErc20.mint(notRelatedAcc.address, price);
        await mockErc20.connect(notRelatedAcc).transfer(marketplace.address, price);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(priceNumber + priceNumber);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equal(price);

        await marketplace.connect(disputResolver).withdrawRedundantTokens(mockErc20.address);

        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(price);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equal(price);
        expect(await mockErc20.balanceOf(disputResolver.address)).to.be.equal(price);
      });

      it("FAIL - not ADMIN role", async function () {
        const { marketplace, mockErc20, seller, buyer, notRelatedAcc, disputResolver } = await loadFixture(
          deployMarketplaceFixture
        );
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const priceNumber = BigInt(price);

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);

        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        await mockErc20.mint(notRelatedAcc.address, price);
        await mockErc20.connect(notRelatedAcc).transfer(marketplace.address, price);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(priceNumber + priceNumber);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equal(price);

        await expect(marketplace.connect(notRelatedAcc).withdrawRedundantTokens(mockErc20.address)).to.be.revertedWith(
          `AccessControl: account ${notRelatedAcc.address.toLowerCase()} is missing role 0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45ddde6135ec42`
        );

        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(priceNumber + priceNumber);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equal(price);
        expect(await mockErc20.balanceOf(notRelatedAcc.address)).to.be.equal(0);
      });

      it("FAIL - no redundant funds", async function () {
        const { marketplace, mockErc20, seller, buyer, notRelatedAcc, disputResolver } = await loadFixture(
          deployMarketplaceFixture
        );
        const price = await getRandomTokenNumber();
        const saleId = 0;
        const priceNumber = BigInt(price);

        await marketplace.connect(seller).createSale(price, mockErc20.address, itemDescription);

        await mockErc20.mint(buyer.address, price);
        await mockErc20.connect(buyer).approve(marketplace.address, price);
        await marketplace.connect(buyer).buyItemOnSale(saleId);
        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(priceNumber);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equal(price);

        await expect(marketplace.connect(disputResolver).withdrawRedundantTokens(mockErc20.address)).to.be.revertedWith(
          "E#10"
        );

        expect(await mockErc20.balanceOf(marketplace.address)).to.be.equal(price);
        expect(await marketplace.addressToTvl(mockErc20.address)).to.be.equal(price);
        expect(await mockErc20.balanceOf(disputResolver.address)).to.be.equal(0);
      });
    });
  });
});
