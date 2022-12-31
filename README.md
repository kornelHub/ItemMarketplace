# Markatplace for physical items

## Coverage
To run coverage check, use:
```
hh coverage
```

or 

```
npx hardhat coverage
```

```
----------------------|----------|----------|----------|----------|----------------|
File                  |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
----------------------|----------|----------|----------|----------|----------------|
 contracts\           |      100 |    91.67 |      100 |      100 |                |
  ItemMarketplace.sol |      100 |    91.67 |      100 |      100 |                |
  MockERC20.sol       |      100 |      100 |      100 |      100 |                |
----------------------|----------|----------|----------|----------|----------------|
All files             |      100 |    91.67 |      100 |      100 |                |
----------------------|----------|----------|----------|----------|----------------|
```

## Documentation

### DISPUTE_RESOLUTIONER

```solidity
bytes32 DISPUTE_RESOLUTIONER
```

### saleIdToSale

```solidity
mapping(uint256 => struct ItemMarketplace.SaleOffer) saleIdToSale
```

### saleIdToDisputeReason

```solidity
mapping(uint256 => string) saleIdToDisputeReason
```

### SaleStatus

```solidity
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
```

### SaleCreated

```solidity
event SaleCreated(uint256 saleId, address sender, uint256 price, address paymentToken, string itemDescription)
```

### SaleCancelled

```solidity
event SaleCancelled(uint256 saleId)
```

### SalePriceUpdated

```solidity
event SalePriceUpdated(uint256 saleId, uint256 oldPrice, uint256 newPrice, address paymentToken)
```

### ItemBought

```solidity
event ItemBought(uint256 saleId, uint256 newPrice, address paymentToken, address buyer)
```

### ItemSend

```solidity
event ItemSend(uint256 saleId)
```

### ItemReceived

```solidity
event ItemReceived(uint256 saleId)
```

### DisputeCreated

```solidity
event DisputeCreated(uint256 saleId)
```

### DisputeResolved

```solidity
event DisputeResolved(uint256 saleId, bool isBuyerRight)
```

### SaleOffer

```solidity
struct SaleOffer {
  address seller;
  uint256 price;
  address paymentToken;
  enum ItemMarketplace.SaleStatus status;
  string itemDescription;
  address buyer;
}
```

### constructor

```solidity
constructor() public
```

### onlySeller

```solidity
modifier onlySeller(uint256 _saleId)
```

### onlyGraterThanZero

```solidity
modifier onlyGraterThanZero(uint256 _price)
```

### onlyActiveStatus

```solidity
modifier onlyActiveStatus(uint256 _saleId)
```

### createSale

```solidity
function createSale(uint256 _price, address _paymentToken, string _itemDescription) external
```

### cancelSale

```solidity
function cancelSale(uint256 _saleId) external
```

### modifySalePrice

```solidity
function modifySalePrice(uint256 _saleId, uint256 _newPrice) external
```

### buyItemOnSale

```solidity
function buyItemOnSale(uint256 _saleId) external
```

### confirmSendingItem

```solidity
function confirmSendingItem(uint256 _saleId) external
```

### confirmReceivingItem

```solidity
function confirmReceivingItem(uint256 _saleId) external
```

### reportProblem

```solidity
function reportProblem(uint256 _saleId, string problemDescription) external
```

### resolveDispute

```solidity
function resolveDispute(uint256 _saleId, bool isBuyerRight) external
```