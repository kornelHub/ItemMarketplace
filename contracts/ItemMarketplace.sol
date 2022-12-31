// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract ItemMarketplace is AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant DISPUTE_RESOLUTIONER = keccak256("DISPUTE_RESOLUTIONER");
    Counters.Counter private saleCounter;
    mapping(uint256 => SaleOffer) public saleIdToSale;
    mapping(uint256 => string) public saleIdToDisputeReason;

    enum SaleStatus {
        ACTIVE,
        PAYED,
        SEND,
        RECEIVED,
        CANCELLED,
        DISPUT_UNRESOLVED,
        DISPUT_RESOLVED_SELLER,
        DISPUT_RESOLVED_BUYER
    }

    event SaleCreated(
        uint256 saleId,
        address sender,
        uint256 price,
        address paymentToken,
        string itemDescription
    );
    event SaleCancelled(uint256 saleId);
    event SalePriceUpdated(
        uint256 saleId,
        uint256 oldPrice,
        uint256 newPrice,
        address paymentToken
    );
    event ItemBought(
        uint256 saleId,
        uint256 newPrice,
        address paymentToken,
        address buyer
    );
    event ItemSend(uint256 saleId);
    event ItemReceived(uint256 saleId);
    event DisputeCreated(uint256 saleId);
    event DisputeResolved(uint256 saleId, bool isBuyerRight);

    struct SaleOffer {
        address seller;
        uint256 price;
        address paymentToken;
        SaleStatus status;
        string itemDescription;
        address buyer;
    }

    /* Error description
    E#0 - You aren't owner of this auction! Only owner can can access it.
    E#1 - Transfer failed!
    E#2 - Invalid sale status! Sale should be in status ACTIVE.
    E#3 - Invalid sale status! Sale should be in status PAYED.
    E#4 - You aren't buyer of this auction! Only buyer can access it.
    E#5 - Invalid sale status! Sale should be in status SEND.
    E#6 - Price must be greater than 0!
    E#7 - Invalid sale status! Sale should be in status DISPUT_UNRESOLVED.
    E#8 - Only owner and buyer can can access it!
    */

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DISPUTE_RESOLUTIONER, msg.sender);
    }

    modifier onlySeller(uint256 _saleId) {
        require(saleIdToSale[_saleId].seller == msg.sender, "E#0");
        _;
    }

    modifier onlyGraterThanZero(uint256 _price) {
        require(_price > 0, "E#6");
        _;
    }

    modifier onlyActiveStatus(uint256 _saleId) {
        require(saleIdToSale[_saleId].status == SaleStatus.ACTIVE, "E#2");
        _;
    }

    function createSale(
        uint256 _price,
        address _paymentToken,
        string memory _itemDescription
    ) external onlyGraterThanZero(_price) {
        uint256 _saleCounter = saleCounter.current();
        saleCounter.increment();
        saleIdToSale[_saleCounter] = SaleOffer(
            msg.sender,
            _price,
            _paymentToken,
            SaleStatus.ACTIVE,
            _itemDescription,
            address(0)
        );

        emit SaleCreated(
            _saleCounter,
            msg.sender,
            _price,
            _paymentToken,
            _itemDescription
        );
    }

    function cancelSale(uint256 _saleId)
        external
        onlySeller(_saleId)
        onlyActiveStatus(_saleId)
    {
        saleIdToSale[_saleId].status = SaleStatus.CANCELLED;

        emit SaleCancelled(_saleId);
    }

    function modifySalePrice(uint256 _saleId, uint256 _newPrice)
        external
        onlySeller(_saleId)
        onlyGraterThanZero(_newPrice)
        onlyActiveStatus(_saleId)
    {
        uint256 oldPrice = saleIdToSale[_saleId].price;
        address paymentToken = saleIdToSale[_saleId].paymentToken;

        saleIdToSale[_saleId].price = _newPrice;

        emit SalePriceUpdated(_saleId, oldPrice, _newPrice, paymentToken);
    }

    function buyItemOnSale(uint256 _saleId) external onlyActiveStatus(_saleId) {
        address tokenPaymentAddress = saleIdToSale[_saleId].paymentToken;
        uint256 paymentAmount = saleIdToSale[_saleId].price;
        saleIdToSale[_saleId].status = SaleStatus.PAYED;
        saleIdToSale[_saleId].buyer = msg.sender;

        bool sucess = IERC20(tokenPaymentAddress).transferFrom(
            msg.sender,
            address(this),
            paymentAmount
        );
        require(sucess, "E#1");

        emit ItemBought(
            _saleId,
            paymentAmount,
            tokenPaymentAddress,
            msg.sender
        );
    }

    function confirmSendingItem(uint256 _saleId) external onlySeller(_saleId) {
        require(saleIdToSale[_saleId].status == SaleStatus.PAYED, "E#3");

        saleIdToSale[_saleId].status = SaleStatus.SEND;

        emit ItemSend(_saleId);
    }

    function confirmReceivingItem(uint256 _saleId) external {
        require(saleIdToSale[_saleId].buyer == msg.sender, "E#4");
        require(saleIdToSale[_saleId].status == SaleStatus.SEND, "E#5");

        saleIdToSale[_saleId].status = SaleStatus.RECEIVED;
        address seller = saleIdToSale[_saleId].seller;
        uint256 paymentAmount = saleIdToSale[_saleId].price;
        address tokenPaymentAddress = saleIdToSale[_saleId].paymentToken;

        bool sucess = IERC20(tokenPaymentAddress).transfer(
            seller,
            paymentAmount
        );
        require(sucess, "E#1");

        emit ItemReceived(_saleId);
    }

    function reportProblem(uint256 _saleId, string memory problemDescription)
        external
    {
        require(saleIdToSale[_saleId].status == SaleStatus.SEND, "E#5");
        require(
            saleIdToSale[_saleId].seller == msg.sender ||
            saleIdToSale[_saleId].buyer == msg.sender,
            "E#8"
        );

        saleIdToSale[_saleId].status = SaleStatus.DISPUT_UNRESOLVED;
        saleIdToDisputeReason[_saleId] = problemDescription;

        emit DisputeCreated(_saleId);
    }

    function resolveDispute(uint256 _saleId, bool isBuyerRight)
        external
        onlyRole(DISPUTE_RESOLUTIONER)
    {
        require(
            saleIdToSale[_saleId].status == SaleStatus.DISPUT_UNRESOLVED,
            "E#7"
        );

        uint256 paymentAmount = saleIdToSale[_saleId].price;
        IERC20 tokenContract = IERC20(saleIdToSale[_saleId].paymentToken);

        if (isBuyerRight) {
            address buyer = saleIdToSale[_saleId].buyer;
            saleIdToSale[_saleId].status = SaleStatus.DISPUT_RESOLVED_BUYER;

            bool sucess = tokenContract.transfer(buyer, paymentAmount);
            require(sucess, "E#1");
        } else {
            //seler rigth
            address seller = saleIdToSale[_saleId].seller;
            saleIdToSale[_saleId].status = SaleStatus.DISPUT_RESOLVED_SELLER;

            bool sucess = tokenContract.transfer(seller, paymentAmount);
            require(sucess, "E#1");
        }

        emit DisputeResolved(_saleId, isBuyerRight);
    }
}
