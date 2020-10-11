
## gas cost

* V1
  * swapAndAddLiquidityTokenAndToken
    * CB > DA: 362931
    * CB < DA: 323633, 365649
    * CB = DA: 362931
    * CB > DA D = 0: 339971
    * CB < DA C = 0: 300329, 342345
  * swapAndAddLiquidityEthAndToken
    * CB > DA: 280750, 322766
    * CB < DA: 280977, 322993
    * CB = DA: 322339
    * CB > DA D = 0: 269559, 311575
    * CB < DA C = 0: 305272
* V1 with binary wearch
  * swapAndAddLiquidityTokenAndToken
    * CB > DA: 360062
    * CB < DA: 360936
    * CB = DA: 234898
    * CB > DA D = 0: 336854
    * CB < DA C = 0: 338555
  * swapAndAddLiquidityEthAndToken
    * CB > DA: 319292
    * CB < DA: 319461
    * CB = DA: 247726
    * CB > DA D = 0: 308459
    * CB < DA C = 0: 301482
* V1 with loose binary search 10000
  * swapAndAddLiquidityTokenAndToken
    * CB > DA: 349734
    * CB < DA: 350558
    * CB = DA: 225212, 267228
    * CB > DA D = 0: 284490, 326506
    * CB < DA C = 0: 286191, 328207
  * swapAndAddLiquidityEthAndToken
    * CB > DA: 308954
    * CB < DA: 309113
    * CB = DA: 195592, 237608
    * CB > DA D = 0: 256085, 298101
    * CB < DA C = 0: 249128, 291144
* V1 with loose binary search 10000, no deadline
  * swapAndAddLiquidityTokenAndToken
    * CB > DA: 349454
    * CB < DA: 308262
    * CB = DA: 224932, 266948
    * CB > DA D = 0: 284210, 326226
    * CB < DA C = 0: 285911, 327927
  * swapAndAddLiquidityEthAndToken
    * CB > DA: 266670, 308686
    * CB < DA: 266829, 308845
    * CB = DA: 237340
    * CB > DA D = 0: 297833
    * CB < DA C = 0: 290876
* V1 with loose binary search 10000, no deadline, cache in binary search
  * swapAndAddLiquidityTokenAndToken
    * CB > DA: 307342, 349358
    * CB < DA: 308166, 350182
    * CB = DA: 224836, 266852
    * CB > DA D = 0: 284114, 326130
    * CB < DA C = 0: 285815, 327831
  * swapAndAddLiquidityEthAndToken
    * CB > DA: 266574, 308590
    * CB < DA: 266733, 308749
    * CB = DA: 195228, 237244
    * CB > DA D = 0: 255721, 297737
    * CB < DA C = 0: 248764, 290780
* V1 with loose binary search 10000, no deadline, cache in binary search, remove _receiveToken
  * swapAndAddLiquidityTokenAndToken
    * CB > DA: 307274, 349290
    * CB < DA: 308098, 350114
    * CB = DA: 224768, 266784
    * CB > DA D = 0: 284080, 326096
    * CB < DA C = 0: 285781, 327797
  * swapAndAddLiquidityEthAndToken
    * CB > DA: 266540, 308556
    * CB < DA: 266699, 308715
    * CB = DA: 195194, 237210
    * CB > DA D = 0: 255687, 297703
    * CB < DA C = 0: 248764, 290780
* V1 with loose binary search 10000, no deadline, cache in binary search, remove _receiveToken, remove _swapToSyncRatio
  * swapAndAddLiquidityTokenAndToken
    * CB > DA: 303975, 345991
    * CB < DA: 345786
    * CB = DA: 266663
    * CB > DA D = 0: 280781, 322797
    * CB < DA C = 0: 281453, 323469
  * swapAndAddLiquidityEthAndToken
    * CB > DA: 305800
    * CB < DA: 305628
    * CB = DA: 237089
    * CB > DA D = 0: 294947
    * CB < DA C = 0: 287693
* V1 with loose binary search 10000, no deadline, cache in binary search, remove _receiveToken, remove _swapToSyncRatio, replace SafeERC20 with TransferHelper to save gas
  * swapAndAddLiquidityTokenAndToken
    * CB > DA: 292169, 334185
    * CB < DA: 291964, 333980
    * CB = DA: 212841, 254857
    * CB > DA D = 0: 269965, 311981
    * CB < DA C = 0: 270648, 312664
  * swapAndAddLiquidityEthAndToken
    * CB > DA: 254733, 296749
    * CB < DA: 254561, 296577
    * CB = DA: 186023, 228039
    * CB > DA D = 0: 243880, 285896
    * CB < DA C = 0: 237628, 279644
* V1 with loose binary search 10000, no deadline, cache in binary search, remove _receiveToken, remove _swapToSyncRatio, replace SafeERC20 with TransferHelper to save gas, separating requirements
  * swapAndAddLiquidityTokenAndToken
    * CB > DA: 292145, 334161
    * CB < DA: 291940, 333956
    * CB = DA: 254833
    * CB > DA D = 0: 269941, 311957
    * CB < DA C = 0: 270624, 312640
  * swapAndAddLiquidityEthAndToken
    * CB > DA: 254709, 296725
    * CB < DA: 296553
    * CB = DA: 185999,
    * CB > DA D = 0: 243856,
    * CB < DA C = 0: 279620
* V1.1 (V1 with loose binary search 10000, no deadline, cache in binary search, remove _receiveToken, remove _swapToSyncRatio, replace SafeERC20 with TransferHelper to save gas, separating requirements, remove _approveTokenToRouterIfNecessary)
  * swapAndAddLiquidityTokenAndToken
    * CB > DA: 292063, 334079
    * CB < DA: 291858, 333874
    * CB = DA: 212735, 254751
    * CB > DA D = 0: 269859, 311875
    * CB < DA C = 0: 270542, 312558
  * swapAndAddLiquidityEthAndToken
    * CB > DA: 254627, 296643
    * CB < DA: 254455, 296471
    * CB = DA: 185917, 227933
    * CB > DA D = 0: 243774, 285790
    * CB < DA C = 0: 237522, 279538



  * swapAndAddLiquidityTokenAndToken
    * CB > DA:
    * CB < DA:
    * CB = DA:
    * CB > DA D = 0:
    * CB < DA C = 0:
  * swapAndAddLiquidityEthAndToken
    * CB > DA:
    * CB < DA:
    * CB = DA:
    * CB > DA D = 0:
    * CB < DA C = 0:
