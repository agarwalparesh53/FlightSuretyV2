pragma solidity >=0.4.21 <0.7.0;

contract IsOperational {
    bool private _isOperational = true;
    address private _contractOwner;
    string tag;
    mapping(address => bool) authorizedUsers;

    constructor(address owner, string memory _tag)
    public
    {
        _contractOwner = owner;
        tag = _tag;
    }

    modifier requireContractOwner()
    {
        require(authorizedUsers[msg.sender] || _contractOwner == msg.sender, tag);
        _;
    }

    modifier requireIsOperational()
    {
        require(_isOperational, "Contract should be operational");
        _;
    }

    modifier isAuthorizedUser(address user)
    {
        require(authorizedUsers[user] || msg.sender == _contractOwner, "Authorized users only");
        _;
    }

    function isOperational()
    public
    view
    returns(bool)
    {
        return _isOperational;
    }

    function setOperatingStatus(bool mode)
    requireContractOwner
    public
    {
        _isOperational = mode;
    }

    function setContractOwner(address newOwner)
    requireContractOwner
    public
    {
        _contractOwner = newOwner;
    }

    function setAuthorizedUser(address authorizedUser, bool status)
    requireContractOwner
    public
    {
        authorizedUsers[authorizedUser] = status;
    }
}