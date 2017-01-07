package bc

import (
	"database/sql/driver"
	"errors"

	"chain/crypto/sha3pool"
	"chain/encoding/blockchain"
)

const assetVersion = 1

var ErrBadAssetLength = errors.New("wrong byte-length for asset id")

// AssetID is the Hash256 of the issuance script for the asset and the
// initial block of the chain where it appears.
type AssetID [32]byte

func (a AssetID) String() string                { return Hash(a).String() }
func (a AssetID) MarshalText() ([]byte, error)  { return Hash(a).MarshalText() }
func (a *AssetID) UnmarshalText(b []byte) error { return (*Hash)(a).UnmarshalText(b) }
func (a *AssetID) UnmarshalJSON(b []byte) error { return (*Hash)(a).UnmarshalJSON(b) }
func (a AssetID) Value() (driver.Value, error)  { return Hash(a).Value() }
func (a *AssetID) Scan(b interface{}) error     { return (*Hash)(a).Scan(b) }

func AssetIDFromBytes(b []byte) (a AssetID, err error) {
	if len(b) != len(a) {
		return a, ErrBadAssetLength
	}
	copy(a[:], b)
	return a, nil
}

// ComputeAssetID computes the asset ID of the asset defined by
// the given issuance program and initial block hash.
func ComputeAssetID(issuanceProgram []byte, initialHash [32]byte, vmVersion uint64) (assetID AssetID) {
	h := sha3pool.Get256()
	defer sha3pool.Put256(h)
	h.Write(initialHash[:])
	blockchain.WriteVarint63(h, assetVersion)
	blockchain.WriteVarint63(h, vmVersion)
	blockchain.WriteVarstr31(h, issuanceProgram) // TODO(bobg): check and return error
	h.Read(assetID[:])
	return assetID
}
