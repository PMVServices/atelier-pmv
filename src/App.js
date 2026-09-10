import React, { useState, useCallback, useEffect, useRef } from "react";
import {genHtml, imprimerFiche, telechargerZip, apercuRapport} from "./pdfUtils";
import {exporterRapportDocx} from "./rapportDocx";

const LOGO_B64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCABjAN0DASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9U6KKKAGt61FJMlvGzuyoq/eZqlPAr85P2zv2pdc8V6xq/wAPPD8V7o2iWkrWupTTI8NxfSf3B/ch/wDQ/wDcrqw+HniZ8kTuwWDnjKvJA+0Phb8bND+MGpeJ4/D2brS9CuksjqX/ACwuZtm9wnqqZT5vevSGTeOa+RP2DL7Rvh1+zrJq+v6pp+h2+pavczedqFwlsm1NkPVyP+edJ8av2wJHu59A+Hs8cm35LjXc74x/1x/v/wC/0rSWG5q0qVLodM8DOpip0MOvhPpPxj8RPDPgCxE/iDW7PSY8fIt1MA7/AO6n3n/CvhL9sL9psePNQ8NW/wAP9XvLa10e4e+kvoFe3Zrj7ibN4GdieZ/33XAX1pc65eT3+oXNxf6jN873V0+93/4HXL65o/l7/kr1cPg40ZczPpcDlNHDz56nvSPsD9mf9uDT/iE9r4Y8eSQaN4lcbLbUAdltfuO3+xN/s/df+D+4Pr1WG3gD8K/CzxfcWPh+Brq+uFtbZeAzda9A+E//AAVw1/4W+Gn8P3nheTxpbwvstL7UtV8maKH+4f3L7/qz1yY/D0qL5qZ5OcYHDYZ89Gf/AG6fsxRX5Ox/8FxNTHD/AAgtZP8Ad8QuP/batWx/4LiWzDF58H5I/wDrj4h/+5q8c+ZP1Nor819N/wCC3HgZuNR+G3iG1/69byCf/wBC2V2+h/8ABZH4Gaoqi+0/xfo79zcabC6/+Q53oA+8aK+VvDP/AAU0/Zz8SMEX4iRaZJ/zz1LTrmH/AMf8vZ+tew+Ev2ivhb46VF8P/Efwvq8rDiG11eB5P++N+6gD0iioo5VkjVkberfxLUtABRRRQAUUUUAFFFFABRRRQAUUUUAFcV8Svit4R+D/AIdk17xn4j0/w1pa5xPfTBN/+yiffd/9hATXzz+3R+3fpH7KfhuHSNJjt9b+IeqQl7TT3b9zaQ9PtM+P4c/cTq5B7A1+JnxW+L/jH43eLLnxH4216617VJicSXEnyQrn7kKfdRP9hMCgD9PvjJ/wWY8O6fdSad8LfCVz4kud+xdU1xjbWze6Qp87/wDAtlfO37TfxM8QQ+H73xlrtzC3jDWpoYTJAnyI+z59iP8AwIieX+NfKfwM0Fde+LnhezlXfD9sSWT/AHU+c/8AoNez/tjXM2t+MvCPhu1HziFpRH/tzSbP/adejh+eFKU4H0GB5qOHq1ofF8Jzfwq0mf4jeKG8X+I4451jfba2+z5C6gfNs9Ov/AzXp3jX9pDQvh2sllYRjW9ZT70Kv+4iPo7/APsicV4r4+8fR+F9PTwx4emMf2eLybm5jP8A44vp/te9c54f+Dus+ILNLgT2UNu39+bd/wCg5rvlOUF7LD+9L7R6Mq1Wivq+D96f2pGj4r/aQ8f+LpG83XJtNtXP/Htpn+jIP++Pm/WvWbP9ofSvBvwh8O27zNr3iV7d90LzFxD+8f8A1r9f+AVzHwf+CtpD40mh8WWtpqWlvZv5O6Vwnnb0A7p2317lp37OvgS4sbWR/C1r5jwo/wDrpv8A4uuDmxNGXvniTxWLwcpur8R5T4R+Auu/tGeF7bxlqXih7Y3U0yLaraGRIwj7MJ844rT/AOGCJ/8Aoam/8AP/ALOvfvDPg7/hEtLTStCmu9J0uF3dLW1vJkRN/wB/+Otj7DrH/QY1P/wMeub4vjPGlWnUnzzPzh+LHgJ/hl4/1Xwy939uewaMefs2b98aP93t9+uQ5r9GPEXwD8LeLdYutV1rSP7S1S5/111Pczb3/g/v1lf8Mv8AgP8A6FiL/v8ATf8AxdZ8oc5+fnNHNfoB/wAMx+BP+hWh/wC/03/xdZk37PPgK31j7M3hqDy3tvM/1839/wD36OUOc+EuaOa9Y/aJ+GmnfDjxnDFpAePTL62+0wwO+8xPvKumfbFdD+z58FfD/wAVNF1e81d76OW0uEhT7LMifwZ7oajlL5jzjwf8YfHXw9kjbwv4z17w+EPyLpupzQKP+Ao1fQfw/wD+CpH7QvgTasviy28UWq/8sNfsEm/8fTY//j9dCn7G/g2T/ltq3/A7tP8A4iua8efsd2Nvo81z4av7r+0ETelresjpL/sbx91/rV8pHMfUXw3/AOC3C5WHx/8ADfZ/evPDl5/7Rm/+OV9afDH/AIKP/AD4pLFFaeOIPD9+/H2PxGn2Bx/20f8Adf8Aj9fkD8Ef2bdN8d+Fo9e12/vIo7iWSOG1tdiZ2vs+d36fPUnx2/ZntPht4NXxNotzdyWsUyQXMN1tbZv+46OO26jlDmP6CtM1Kz1qyhu7C6ivLWYbkmt3Do//AAIVe2iv56f2PLfx1eeLNQbwp4413wjp+nw+fcyaNeOnmu3CJs+4c4/jUj5K/RzwX+2B8RPBdolprbW/jPyk/wBZfIlrdP8A8DhTZ/45S5Q5j77or4O+GH7eviDxzdeH9XuLXS4PC+pzI9zH5L+dbw79j/Pv++n/ALJX2z4e8SaX4t0qHVNF1W11nTphmK7sbhJoX+jpUFmxRXin7THxj1L4Q+H9Jk0WGB9Uv7hx/pS7kWFEy5/9ArT/AGdvHHiT4j/D0eIfEaWkUl1cyJbraxbF8lMJ/fP8YegD1iiiigD+bL9qT4ial8Uv2hviH4k1WR3nudYuYYVfrDDE5jhj/wCARoifhXk9fbv/AAUw/ZD1b4K/FTVvH+j2Rk8B+Kbx7sTQodlheP8APJC/9wO+907YOz+CvjDR9FvNevEtLG3e6uH5EcfWgcI8/wAB6Z+zDcLafFqwlfosEx/8cNdH+0h4qnsfjEL+IETQ6XDDDIDjazo2X/8AH2rhvBunap8P/HejXuo2c1nBJKYg8wxww2k/k1af7Q3nv4utbiX/AJaWir/3y7ivV5ZRwn+GR9FDmjl0v5oyPKWyzHNXtJ1y+0S6S4srmW2mTo8b4NUE+Z1r9G9W/YX+H2h6HPqd3pV39mtofOmk+3TV50b8/uHgQ5+b3Nz56+EvjK++IP22zexeS/sbb7VNNCnymHeiFiP+BpX0j8JPGjx3MGia2/8Aos3yW11J/A/9x/8AYr0L4J/sz+Gvg948/tLTLFke+sJrObzrh5o3T5H/AI64rxd8Pf8AhH7xERPMtbyFLqH/AHH/AIK9zD4j6zD2NY+rweKp5pS+p4r4yt8cvE3xc8D+LYLDwR8O/wDhJNHe2R3vvs011++/jT5H+TZXnf8Awtv9pD/ojP8A5R7n/wCLr0/xX+17qPwd0PRbO98GXPicsrRjUIbzyM7PuI6eW/z7K5b/AIeX/wDVKtQ/8GX/ANorxqsZ058kj5jEYeWFn7GZzP8Awtv9pD/ojP8A5R7n/wCLpn/C2/2kP+iOf+Ue5/8Ai66n/h5f/wBUq1D/AMGX/wBoo/4eWf8AVKdQ/wDBl/8AaKw5jn5D1r4Nx+LPGHgdNS8beGT4Y1l5nT7EY3j3p/A+x/nT/wCwrTuvB32rxaibPuab/wC1q6b4HfFaP45fD9PEw0C98OB7l7X7Ne/OH2fxo/8AGnz/APjj11Vrap/wmz/9gr/2tV85HIfnH/wUE0T+w/FnhGPZs36dMf8AyMa3/wBgjS/7R0LxJ/sX8H/ot6t/8FRI0Txx4E2f9Aqb/wBHUf8ABPe6S10LxRv/AOf6D/0W9OPxCl8B87/tNRvY/Hzx3CjttTU5Er6c/YX0m/1T4TeIZbrzZLJNUjSz3/8AXP59n/jle4+Jv2wvg14L8SahoviBJpNXsZvIufL0RJvn/wB/+OvK/jB/wUB8FR+GZrHwDp11c6k6OlvJNZpbWts/9/Z/HSKLvwh06KTwfqKW/wDqUvNW8nZ/19TVsX2lp8Vv2GdQ1V/9LupvDf2p5P8AptbfO/8A4/C9ch+yzdf8WV095W3O8V67vJ/F8711n/BPvxBD4y/Z01jwrdnP2O8udO2f9MLlN/8A6G70SFE5r/gnF4Hjuvhf4v1iVPnvNVS1V/8AYhg3/wDtauh+HuqSeMPB+oa8ZnnS51vUvJ/2IUmdET/vitH9nq6Pwb/YZ1DVbhPIvobbVtQ/7bb3hT/0BK4f9l26x+znoifx/abz/wBHURCRnfsI6wniPQNd0KX95No9/wCcif8ATGb/AOzR/wDvuvD/ABx4k8d/sl/HzxPYeCfE+peF/JvPtFt9hn2RTQuN8e+P7j/I/wDGKs/sX+Ov+EN/aEtLaVilnrIm0+Tnjf8AfT/x9AP+B17L/wAFBvhfL4q8bfD3XtIi33OtBNAm7/v9/wC4/wDHHf8A74oGfQPhP4peNPjl8D/D/jb4izWsmpfZJpEntrfyU+zI7/vnT7m99n8H+xX2l+zJ8Ufh18RvhjpEPw98T2Ou2OnWiQyx27lJ4Wx/y2hf50P+/XwR+1z4ksPg/wDsyzeHtLdE/wBEh8OWmz+5s2P/AOOI9fm54D+IHiL4ZeJbbX/C2tX2g6xbf6q9sZ/LcdAR/tL/ALJ4qAP6f6K/Pb9h3/gp5p/xmutP8DfE77PovjSUiKx1eIeXZ6o39xx/yxlxj/YfnGzhK/QmgoxfE/hnSvGnh+/0TW9NttV0i/h8m5sryISQyof4XU9a/L/9ov8A4Jgr8Jdcn+InwuvPP8MWXmXN/wCHtRm/fWcIRzI8M3/LREH8D/Pwfnev1WU8CsLxvo3/AAkng/XdJ27vttlNbY/30Zf61pRnyTjI3w8/Z1YTP58fj9oV+dN0bWEDS2Cb4W2dI3blD/wMD/xyvP8AxR4wj8V+G9KS7LjU9PbyfMH/AC1ix94/7QK4r9HfjR+zHf8Awf0lE1KwfW/A2qWkO66dd/2Z2T54Zv7nz42P/wCz18WeNv2aIbWY3HhvWYri0b/l21D5JE/4GvD17eIhOrOU6PvRkfU43D1MTKdbCe9CZ4Aq5avorwL+0l8VPH2rLoOt+NNR1LRJoWjurScpslhRPufc9lryPxZ4AvfBtrBLfT26PcfNFFEzN5qf3/pXpH7Lfhg6tqWvam6/u7a3SJG/23fj/wBArzaFKUa8YyPEwVCUcZCEz6E/ZJ+OfjfxV8edb0XxX4mvtZ0zStMufslrdlNkX76FPT+5X0Z4m8nWPB+jzfx2yJ/3w6V8TfAuZ9G/aW8ZeV/DazJ/5Hhr6n0rxB5/h61hf7n2ZKqEeTEkUZTo5j7n8wzR9Ym8HeIbXVbff8j/AL6OP+NP40qG4/4KLfDGzuJIJrXxNHLG21lk05N6uP8AtvWbrF8myuEg0PStY8VaWkulaf8AJNvmnjs4Ud/433vs3vXq4jC+298+rzTL/rK9t/Iehf8ADyb4Uf8APHxJ/wCACf8Ax6j/AIeTfCj/AJ4+JP8AwAT/AOPVak8K+A/+hM8N/wDgqh/+IpknhXwN/wBCZ4e/8FUP/wARXz/Kfn/OesfDT46+H/jF4XPiDw89w9l5z2zx30Wx0dP/ANtKuR+Jkg8bb3f/AJhv/tavMtN1Ww0OwSz0yzt9Nsk+5a2sKQon/AErIvvEc0nidHif/lw/9no5TPnPA/8Agpdqy6p428EOnRdNmH/kasD9jfWLfSfDviXzr+3tHN5DhJ5lTPyP61gftraw+q+NvD0Lt88GmZ2f700hrgPhP4U8IeINO1mbxDqptb+32Gy09rlbRLnn5wZnRwlY1KkaEeZBUqctLmkZ3x4v01D4xeLbmOZZ45r938yN9yt+NcCfave4fglYarrHhVbaxms9E1LUBZy6lb6vDfoWK52LsRNr/K/Wq3jL4c+EvD/9swwQwPJZ+akRbxNC0pZDjPlCHlv9iuP69SnLlOeOOpfAe1fs+69YWHwT0lJdStLeZIrrfG9yiP8AfeuC/Yf+LFj8PvE2u6Xqeox6bb6rFC0Mlw+xPOR/7/b5HNQTfAfw9HN4atYLK61GfV7KC4ffr1tbOjv98JC6b2rDm+C/hnVtT8a+HNBv7y71/Rz52nef8ou0QDz4dmzO9G3emcVEMxoTMIY6lUPd/wBrr42aLH8IbrwtpOpWcl9qMyL9lsnjcJDv3v8Ac+586Vi/sy69YWfwb0y2uNRtLd1ubk+XNcoj/frwW3+F+maL8NdP1nXJLiPW9aulj0uzRtgWEN88z5/zytdh4j+BPhfwzfePLueXVLrSfDq2YhtI5kSaVpk/jcpxzn+CtJY+lGRpLGUoe4eDWmqT6J4kg1K0fy7m0uxcwv8A7SPuU/mK/SXTvi14P+IukaDqtxqWmTmzmh1O2jkuUR7a5RP7n+xveviP4deEPCnxP8d6TotpY6po9u6zNcSSX6XDvsQuuz9ym3p71J4u8H+FdD0e+e1hg+0RttR4/EkNw/3/APnkkPzfnVfXIRl7Ll94qWKhzey+0dz+2p8W7bx7rmi6Fpl/HfWWmxvPcPA+9DM5xj/gCJ/4/XzFzX0Q3wq8DXl5Y2nh6ceJDcImx38QQ2c0kp/g8qSCvEPE2j3Oga9faddW72NzbytE9s7bmjIP3d1XTxMcRL3TShiI1fciZEcjRyKyNsdejV+9X/BNT9pa+/aI+A/leIbhrzxV4XmTTL+5YZa6Qpuhnbr87J8rerxO38VfgnzX6o/8EX/B+oXPhf4p60l5JZWFxeafZROnSSSJJ3f8hOh/4FXQdh+qlFLRQBRvLSDULd7e4hSaGVdro67lZfSvL7j9lX4TXWrf2jJ4B0Q3W7fzajZn/c+5+let81zvjrWn8M+CPEOrRMqS2Nhc3SM/QMkbP/StIynH4GbUp1YaQkZfjD4QeCPiB4Xj8N+JPCekaxocabYrG6tEMcP+5/c/4Divzu8f/BrwH8E/GXiXQvAVnJYaMlxG80E1w8u2bZ86I7/PsT/4uvsZf2rvDx+C9t4uee3GtXEPkJpPmfvDeY+ZNv8AcHL7v7nNfIfg2zuPil8StF0h3ee61S/8y5f/AGN++Z/++N9ephKUoSnOZ9JleFnSnOvW+yfG/wAaPhD8bf2d/Gur+Mbvw1qOi6ZqckkkOuQwx3Vq8MkgdN8mHWNvuff2vXWfs5/FzWvH2h6nY6ij3dxpCJM98if8sncId/51+6ElpDcWzW0kSvAy7GiZflK+lfKvxm/4JufC/wCJUl5qXho3nwz8RXGd9/4XbyYJvaW2B2MOv3NnWuKliJU5854mHxcsPifbHwrqviD5Pv1qfDLwrc+LptRv4vtEcFtshSSD+/TfjT+zv43+ANzZW3imS01a2u9yW+sadv8AJuXQZ+dH+4/+x/3xXxr8Q/iJrcPi69i0vWdQsbSBzCkdndvGny8N9019Biq0Pq/PD7R9lmmMhPL+aj9s/Qj/AIVjf/8APzqH/ff/ANhR/wAKxv8A/n51D/vv/wCwr8zP+FleLf8Aoatb/wDBhN/8XR/wsrxb/wBDVrf/AIMZv/i6+Y5j875D9EvFvwd8U3Wl3T6B4n1TStQRHeHz4YZoX/3/AJK+F/8Aho/4iR3Xnf8ACQnzdmz/AI9of/iK5f8A4WT4s/6GrW//AAYTf/F1zXNLmCMDU8SeJtU8YatNqusXcl9ezHLzSHJNe8/s8/Bnxp498KaprHhfxLpvh62OopYMl8rgSv5e/hvLfna52p95+eK+c8HOK1tO8SatpLWn2PUry0+yXAu7fyLl4/KmGMSpg/K/A+brWUoxnpIcoRn7sj6+sv2W/i144sdA1/SfiHpd/ozb73S76SS6tSmI0eN/J8n5Gcuyp/1zesT4nfBv4meEdHtH1Lx1pmqrreqLocMMAzI8j7Ebzvk3J98etfO1x8X/AB3f3clzceMvEE9zK6O8j6nMXZl+6T8/asyHxr4gtdLTTYtb1KOwS6+2rapeOIRN/wA9dmcb/wDa61n7Cl/IZ+wpfyH1T42/Y5+JWh6poUvijxzo0d2t4NC0aZHuZnNykj/Zo/kh/do6J5yO/wDA6VhXXwB8a3F0/jmw+IFlqWosiSQ30Ec8M0zvp6Xmwb0T/l2mh/77rwuL4wePbNZzH408QR/aIfJlxqk3zp93afn5Hy1W0/4leKtKh8qx8TazYwhopPLtr6WP50RUjbAf+BERV9AielP2cP5TT2dL+Q93+KX7Ofj7TLfwT4h8U+MtNu5fEF3Yafbz3Esw+x/aQ7oXOz7ibH37PuZT1re0f9nX4u3epQalfeN7PQvEmrzDT7m2vriRJEdLVJilz8n8ELx/3/vV8u6x4y1zXlmGqazqOp+a6vJ9runm3uvmbGO/082T/vt/71XZvih4wuFvUk8V626X0nn3e7UZj9pfZs3yZf522fLz24p+ypfDyh7Ol/IfSl98BfiVHcXV4PHdh/wkvhu21K9uLFYJ4Zrf7NHB9pQP5O13/fQp1qla/BP4leKPAeg6r4h8Y2OlaT4osXurWG7tZnZyLqGFI32Q/Iz+dC6f7D188r8TPF0OpNqCeKNah1J3eZ7tdRmWZmfYzuX3Zy2xM+uxKrzfEDxNdT3MsviLVZJrh0eaR76XfM652M53cle3pS9jS/lM/YUv5T69sP2bfjHfXmoafpPxA0mbWdLmjs7+3RJ0eG5cQukMb+R8/wC6m8z5P+ebf7Ofi7Vrm5utQuZLudrm5aV/NldtzO2eWzXQyfGLx5N9h3+NvEL/AGH/AI9M6rN+4/3Pn+X8K7r4E/sifFL9pHUEHg7wrcPpjPibWr7MGnw8/wDPZvvkf3E3t7URpQh8ES40qUPgieb+BPAOt/ErxhpXhjw5ZPqWtapOtvbWyYG5j688L/te1f0RfsrfAXTv2ZvgjoHgaxIurm1Qz6jexoR9qvHwZZOecZAVc/wIleZfsZfsH+FP2S9Ll1N5/wDhJPHl7EIrzWniKJChxmG2T+BP9v77+33R9WVqWFFFJQA2vIP2stYbQf2ePHd0n3/7Mkh/77+T/wBmr18dq4v4rfDjTPi/4H1Twnq0lzDY3yoJHs5Nki7HDqQf95BV0pRhOPOb0JRhVhOR+Otr4j8ivvP9gz4S3NvpN18RdatmSa/X7NpEci/OLb+Of/gZxs/2F/268V+K3/BPfx14Naa68K3Fv4w09RkQn/Rrxf8AgH3G/wCAuP8Acr6u/Yq8Xajr3wgt9A161urHxF4Yk/sq7tr2Fo5lRP8AUttYdNny/wDADX0eNrwnh/3J9nm2Mp1sJfDS9T6JFLRRXzJ8KcX8TPhtofxb8HX/AIa8Q2v2rTLtOdnyPE38Lo38Lr2NfL/7UP8AwTH+HHx006bUvDVvH4E8ZIh2XunRD7Lctjj7RD35/jTD+u/pX2kKKrnfwl88uXkufzQfG/4DeMv2e/GkvhjxppTadfLl4ZkG+G7izjzYn/jWvOua/o1/aw/Zq0b9p/4R6p4X1OOKLV442m0XU5Ey9neY+R/9xvuuv90/TH86t/p0+k31xZ3SGG6t5Xiljb+F0OCPzqSCpzRzRzRzQAc0c0c1r6L4R1zxFJs0rRb/AFZ/7ljavN/6AKAMjmjmvaPC/wCxx8cPFWyTTfhR4rkRvuSXGlS20Z/4HIEr1fwv/wAEq/2ivETI1x4TsNBikOd+qarbf+go7t+lAHyBzRzX6Q+Ev+CJvj2+8tvEnxC8P6Tn7yabbT3rL/335Ne3+Dv+CK3w10zy28S+NfEeuuhyVskhs43+o2O3/j9AH4381b03TbzWLyO2sbaW8uZD8kMMe92/4CK/fnwR/wAE1f2d/A7RvF8PLfWZ16z65czXm7/gDvs/8cr33wr8O/C/gW3+z+GPDmk+Hof+eelWEVsn/jiigD8Afh5+wb8evicY30n4aavaW0xz9p1iNdPjA9R55TP/AAGvqj4Yf8EU/FmptFceP/HOm6DB1az0SF7yb6b32In/AI/X690UAfKXwf8A+CaHwF+EhguT4V/4S7Votv8Ap3iWT7X83r5PEP8A45X1Fa2kFjbJb28SQ28S7EiRdiKtW6KACiiigAooooAKSiigAwD1GaZ5KBt+0bsdaKKAJKKKKACiiigAr81/GH7E3wXvPHGrSzeDPMkm1GZ5GOqXvzFpPmP+u75oooA9W+Gv/BOn9ne+jaS5+HENw4GQZdVvm/nPXrGkfsK/s/6H5X2b4S+GZP8Ar7sxc/8Ao0tRRQB3ug/A/wCHPhoQ/wBkeAPC+lf9eWjW0P8A6CgrtobWGziSKCJYYx0WMbR+lFFAE9FFFABRRRQAUUUUAFFFFABRRRQAUUUUAf/Z";
const SUPA_URL = "https://pupbzngvudprcweukuoi.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1cGJ6bmd2dWRwcmN3ZXVrdW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxODY3NDAsImV4cCI6MjA5Nzc2Mjc0MH0.jn025v42M3qNpAKfvy49cdCySBdTqwRz99b1EfaKYoo";
const H = {"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY};
// LOGO_B64 moved to pdfUtils.js
// LOGO_B64 is in pdfUtils.js;
const db = {
  async get(t,p=""){try{const r=await fetch(SUPA_URL+"/rest/v1/"+t+p,{headers:{...H,"Prefer":"return=representation"}});return r.json();}catch(e){return[];}},
  async post(t,b){try{const r=await fetch(SUPA_URL+"/rest/v1/"+t,{method:"POST",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify(b)});return r.json();}catch(e){return null;}},
  async patch(t,p,b){try{const r=await fetch(SUPA_URL+"/rest/v1/"+t+p,{method:"PATCH",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify(b)});return r.json();}catch(e){return null;}},
  async del(t,p){try{await fetch(SUPA_URL+"/rest/v1/"+t+p,{method:"DELETE",headers:H});}catch(e){}},
  async uploadPhoto(path,file){const r=await fetch(SUPA_URL+"/storage/v1/object/photos/"+path,{method:"POST",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":file.type,"x-upsert":"true"},body:file});if(!r.ok){const e=await r.text();throw new Error(e);}return true;},
  photoUrl(path){return SUPA_URL+"/storage/v1/object/public/photos/"+path;},
  async deleteFile(path){try{await fetch(SUPA_URL+"/storage/v1/object/photos/"+path,{method:"DELETE",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}});}catch(e){}},
  async upsert(table,body,conflict){
    const r=await fetch(SUPA_URL+"/rest/v1/"+table+"?on_conflict="+conflict,{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(body)});
    if(!r.ok){const e=await r.text();throw new Error(e);}
    if(!r.ok){const e=await r.text();throw new Error(e);}
return null;
  }
};

const PIN_CODE="3739",PIN_KEY="pmv_pin_ok";
const DRAFT_KEY="pmv_draft_fiche";
function saveDraft(d){try{sessionStorage.setItem(DRAFT_KEY,JSON.stringify({...d,ts:Date.now()}));}catch(e){}}
function loadDraft(){try{const s=sessionStorage.getItem(DRAFT_KEY);return s?JSON.parse(s):null;}catch(e){return null;}}
function clearDraft(){try{sessionStorage.removeItem(DRAFT_KEY);}catch(e){}}
const TECHNICIENS_FB=["AD","CB","JM","KD","CD","RC","MC","DN","EL","Autre"];
const CATS_FB=["Vue d'ensemble","Plaque moteur","Plaque pompe","Plaque ventilation","Plaque réducteur","Autre plaque","Stator avant","Stator arrière","Rotor","Flasque avant","Flasque arrière","Arbre avant","Arbre arrière","Divers"];
const ROULEMENTS=["608 ZZ C3","608 RSH","6000 ZZ C3","6001 ZZ C3","6002 ZZ C3","6003 ZZ C3","6004 ZZ C3","6005 ZZ C3","6006 ZZ C3","6007 ZZ C3","6008 ZZ C3","6009 ZZ C3","6010 ZZ C3","6011 ZZ C3","6200 ZZ C3","6201 ZZ C3","6202 ZZ C3","6203 ZZ C3","6204 ZZ C3","6205 ZZ C3","6206 ZZ C3","6207 ZZ C3","6208 ZZ C3","6209 ZZ C3","6210 ZZ C3","6211 ZZ C3","6212 ZZ C3","6213 ZZ C3","6214 ZZ C3","6215 ZZ C3","6216 ZZ C3","6217 ZZ C3","6217 C3","6218 ZZ C3","6218 C3","6219 ZZ C3","6219 C3","6300 ZZ C3","6301 ZZ C3","6302 ZZ C3","6303 ZZ C3","6304 ZZ C3","6305 ZZ C3","6306 ZZ C3","6307 ZZ C3","6308 ZZ C3","6309 ZZ C3","6310 ZZ C3","6311 ZZ C3","6312 ZZ C3","6313 ZZ C3","6314 ZZ C3","6315 ZZ C3","6316 ZZ C3","6317 ZZ C3","6317 C3","6318 ZZ C3","6318 C3","6319 ZZ C3","6319 C3","NU 206 C3","NU 208 C3","NU 209 C3","NU 210 C3","NU 212 C3","NU 213 C3","NU 214 C3","NU 215 C3","NU 308 C3","NU 309 C3","NU 310 C3","NU 311 C3","NU 312 C3","NU 313 C3","NU 314 C3","NU 315 C3","NU 316 C3","NU 319 C3","NU 322 C3","Autre"];
const ETAPES=["Entrée","Infos électriques","Information rotation avant démontage","Information matériel au démontage","Information des essais après remontage"];
const STATUTS_CHANTIER=[
  {id:"A_demonter",label:"À démonter",color:"#D73A49",bg:"#FFF5F5"},
  {id:"Devis",label:"Devis",color:"#E8720C",bg:"#FFF8E1"},
  {id:"Devis_envoye",label:"Devis envoyé",color:"#0891B2",bg:"#ECFEFF"},
  {id:"En_commande",label:"En commande",color:"#1B4F8A",bg:"#EEF4FF"},
  {id:"A_remonter",label:"À remonter",color:"#22863A",bg:"#F0FFF4"},
  {id:"Termine",label:"Terminé",color:"#6B7280",bg:"#F5F6F8"},
  {id:"Abandonne",label:"Abandonné",color:"#9B59B6",bg:"#F5EEF8"},
];
const SUPA_URL_STORAGE="https://pupbzngvudprcweukuoi.supabase.co";
const SUPA_KEY_STORAGE="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1cGJ6bmd2dWRwcmN3ZXVrdW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxODY3NDAsImV4cCI6MjA5Nzc2Mjc0MH0.jn025v42M3qNpAKfvy49cdCySBdTqwRz99b1EfaKYoo";
const STORAGE_LIMIT_GO=1;
const STORAGE_ALERT_PCT=70;

const MARQUES_MOTEUR=["WEG","ABB","Siemens","Leroy Sommer","Nidec","Autre"];
const MARQUES_POMPE=["Grundfos","KSB","LOWARA","WILO","XYLEM","FYGT","SALMSON","SIHI","SEEPEX","Autre"];
const siNeuf=v=>v.moteur_neuf==="Oui";
const siAncien=v=>v.moteur_neuf!=="Oui";
const siPompeNeuve=v=>v.pompe_neuve==="Oui";
const siPompeAncienne=v=>v.pompe_neuve!=="Oui";
const MARQUES_REDUCTEUR=["SEW-Eurodrive","Bonfiglioli","Nord Drivesystems","Flender","Bauer","Autre"];
const siReducteurNeuf=v=>v.reducteur_neuf==="Oui";
const siReducteurAncien=v=>v.reducteur_neuf!=="Oui";
const CHAMPS_IDENTITE_COMMUN=["client","marque_moteur","puissance","vitesse","type_moteur","numero_serie","fixation","tension","materiel_lieu"];
const CHAMPS_IDENTITE_POMPE=["marque_pompe","modele_pompe","numero_serie_pompe","debit_nominal","pression_nominale","type_fluide","temperature_fluide"];
const CHAMPS_IDENTITE_REDUCTEUR=["marque_reducteur","numero_serie_reducteur","modele_reducteur","type_reducteur","vitesse_sortie","rapport_reduction"];
function champsIdentitePour(typeMateriel){
  if(typeMateriel==="Pompe")return CHAMPS_IDENTITE_COMMUN.concat(CHAMPS_IDENTITE_POMPE);
  if(typeMateriel==="Moto-réducteur")return CHAMPS_IDENTITE_COMMUN.concat(CHAMPS_IDENTITE_REDUCTEUR);
  return CHAMPS_IDENTITE_COMMUN;
}

const CHAMPS={
  "Entrée":[
    {id:"date_entree",label:"Date d'entrée",type:"date",required:true,groupe:"entree_de"},
    {id:"client",label:"Client",type:"client",required:true},
    {id:"de",label:"N° DE",type:"text",required:true,groupe:"entree_de"},
    {id:"delai_valeur",label:"Délai demandé par le client",type:"number",required:true,groupe:"delai_pair"},
    {id:"delai_unite",label:"Unité",type:"select",options:["Jours","Semaine(s)","Mois"],required:true,groupe:"delai_pair"},
    {id:"mail",label:"Mail du client",type:"text",required:true,groupe:"mail_tel"},
    {id:"telephone",label:"Téléphone",type:"text",required:true,groupe:"mail_tel"},
    {id:"materiel_lieu",label:"Matériel / Identification lieux",type:"text",required:true},
    {id:"marque_moteur",label:"Marque moteur",type:"select",options:["WEG","ABB","Siemens","Leroy Sommer","Nidec","Autre"],required:false,autreTexte:true},
    {id:"puissance",label:"Puissance",type:"text",required:false,unite:"kW",groupe:"puiss_vit"},
    {id:"vitesse",label:"Vitesse",type:"select",options:["1000","1500","3000","Autre"],required:false,unite:"tr/mn",autreTexte:true,groupe:"puiss_vit"},
    {id:"type_moteur",label:"Type",type:"text",required:false,groupe:"type_serie_moteur"},
    {id:"numero_serie",label:"Numéro de série",type:"text",required:false,groupe:"type_serie_moteur"},
    {id:"fixation",label:"Fixation",type:"select",options:["B3 (pattes)","B5 (bride)","B14","Spécial"],required:false,autreTexte:true},
    {id:"tension",label:"Tension",type:"select",options:["230/400","400/690","Autre"],required:true,unite:"V",autreTexte:true},
    {id:"depose_nos_soins",label:"Déposé par nos soins",type:"oui_non",required:true},
    {id:"enleve_nos_soins",label:"Enlevé par nos soins",type:"oui_non",required:true},
    {id:"tech_entree",label:"Technicien",type:"technicien",required:true},
    {id:"demande_client",label:"Demande client",type:"text",required:true,dictee:true},
  ],
  "Infos électriques":[
    {id:"couplage",label:"Couplage",type:"select",options:["Étoile","Triangle","Absent"],required:true},
    {id:"isol_masse",label:"Isol. masse",type:"ohm",required:true,groupe:"isol_masse_pair"},{id:"isol_masse_dar",label:"DAR masse",type:"number",unite:"DAR",required:false,groupe:"isol_masse_pair"},{id:"isol_uv",label:"Isol. U-V",type:"ohm",required:true,groupe:"isol_uv_pair"},{id:"isol_uv_dar",label:"DAR U-V",type:"number",unite:"DAR",required:false,groupe:"isol_uv_pair"},{id:"isol_vw",label:"Isol. V-W",type:"ohm",required:true,groupe:"isol_vw_pair"},{id:"isol_vw_dar",label:"DAR V-W",type:"number",unite:"DAR",required:false,groupe:"isol_vw_pair"},{id:"isol_wu",label:"Isol. W-U",type:"ohm",required:true,groupe:"isol_wu_pair"},{id:"isol_wu_dar",label:"DAR W-U",type:"number",unite:"DAR",required:false,groupe:"isol_wu_pair"},
    {id:"adx_resultat",label:"ADX mesure isol. — résultat",type:"select",options:["PASS","Douteux","Hors Tolérance"],required:true},
    {id:"adx_valeur",label:"ADX mesure isol. — valeur",type:"ohm",required:true},
    {id:"plaque_bornes_etat",label:"Plaque à bornes — état",type:"select",options:["OK","HS"],required:true},
    {id:"plaque_bornes_taille",label:"Plaque à bornes — taille",type:"text",required:true,condition:{champ:"plaque_bornes_etat",valeur:"HS"}},
    {id:"sonde_presence",label:"Résistance sonde — présence",type:"select",options:["Absente","Présente"],required:true},
    {id:"sonde_valeur",label:"Résistance sonde — valeur",type:"mesure",unite:"Ω",required:true,condition:{champ:"sonde_presence",valeur:"Présente"}},
    {id:"tech_elec",label:"Technicien",type:"technicien",required:true},
    {id:"conclusion",label:"Conclusion",type:"text",required:true,dictee:true},
  ],
  "Information rotation avant démontage":[
    {id:"essai_vide_avant",label:"Essai à vide possible",type:"select",options:["Oui","Non"],required:true},
    {id:"essai_vide_avant_pourquoi",label:"Pourquoi essai à vide impossible",type:"text",required:true,dictee:true,condition:{champ:"essai_vide_avant",valeur:"Non"}},
    {id:"rotor_cc_realise",label:"Vérif rotor court-circuit — réalisée",type:"select",options:["Oui","Non"],required:true},
    {id:"rotor_cc_resultat",label:"Vérif rotor court-circuit — résultat",type:"select",options:["OK","HS"],required:true,condition:{champ:"rotor_cc_realise",valeur:"Oui"}},
    {id:"int_p1_avant",label:"Intensité Phase 1",type:"mesure",unite:"A",required:true,groupe:"int_avant"},
    {id:"int_p2_avant",label:"Intensité Phase 2",type:"mesure",unite:"A",required:true,groupe:"int_avant"},
    {id:"int_p3_avant",label:"Intensité Phase 3",type:"mesure",unite:"A",required:true,groupe:"int_avant"},
    {id:"vib_av_mms_avant",label:"Vibration avant à 400V — mm/s",type:"mesure",unite:"mm/s",required:true,groupe:"vib_avant"},
    {id:"vib_av_ge_avant",label:"Vibration avant à 400V — GE",type:"mesure",unite:"GE",required:true,groupe:"vib_avant"},
    {id:"vib_ar_mms_avant",label:"Vibration arrière à 400V — mm/s",type:"mesure",unite:"mm/s",required:true,groupe:"vib_arriere"},
    {id:"vib_ar_ge_avant",label:"Vibration arrière à 400V — GE",type:"mesure",unite:"GE",required:true,groupe:"vib_arriere"},
    {id:"skf_av_rot",label:"Screen SKF avant rotation",type:"photo_skf",categorie:"Screen SKF avant au démontage",required:false},{id:"skf_ar_rot",label:"Screen SKF arrière rotation",type:"photo_skf",categorie:"Screen SKF arrière au démontage",required:false},
    {id:"int_560_p1_avant",label:"Intensité 560V — Ph.1",type:"mesure",unite:"A",required:false,groupe:"int560_avant"},
    {id:"int_560_p2_avant",label:"Intensité 560V — Ph.2",type:"mesure",unite:"A",required:false,groupe:"int560_avant"},
    {id:"int_560_p3_avant",label:"Intensité 560V — Ph.3",type:"mesure",unite:"A",required:false,groupe:"int560_avant"},
    {id:"nettoyage_hp",label:"Nettoyage HP",type:"select",options:["Oui","Non"],required:true,groupe:"hp_etuvage"},
    {id:"etuvage_stator",label:"Étuvage du stator",type:"select",options:["Oui","Non"],required:true,groupe:"hp_etuvage"},
    {id:"isol_masse_hp",label:"Mesure isolement masse (suite HP)",type:"ohm",required:true,condition:{champ:"etuvage_stator",valeur:"Oui"}},
    {id:"isol_enroul_min",label:"Isolement enroulements — plus petite valeur",type:"ohm",required:true},
    {id:"tech_mesure_avant",label:"Qui a mesuré",type:"technicien",required:true},
  ],
  "Information matériel au démontage":[
    {id:"moteur_neuf",label:"Moteur neuf",type:"oui_non",required:true},
    {id:"ventilateur_present",label:"Présence d'un ventilateur",type:"oui_non",required:true,condition:siAncien},
    {id:"circlips_avant",label:"Circlips avant",type:"text",required:false,groupe:"circlips",condition:siAncien},
    {id:"circlips_arriere",label:"Circlips arrière",type:"text",required:false,groupe:"circlips",condition:siAncien},
    {id:"rondelle_presence",label:"Rondelle souplesse — présence",type:"select",options:["Oui","Non"],required:false,condition:siAncien},
    {id:"rondelle_avant",label:"Rondelle souplesse avant",type:"select",options:["Oui","Non"],required:false,condition:v=>siAncien(v)&&v.rondelle_presence==="Oui",groupe:"rondelle_pair"},
    {id:"rondelle_arriere",label:"Rondelle souplesse arrière",type:"select",options:["Oui","Non"],required:false,condition:v=>siAncien(v)&&v.rondelle_presence==="Oui",groupe:"rondelle_pair"},
    {id:"etat_ventilateur",label:"État ventilateur",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,condition:v=>siAncien(v)&&v.ventilateur_present==="Oui",groupe:"ventilateur_pair"},
    {id:"taille_ventilateur",label:"Taille ventilateur",type:"text",required:false,condition:v=>siAncien(v)&&v.ventilateur_present==="Oui",groupe:"ventilateur_pair"},
    {id:"type_roulement_av",label:"Type roulement avant",type:"roulement",required:true,condition:siAncien},
    {id:"etat_roulement_av",label:"État roulement avant",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,groupe:"roulement_av_pair",condition:siAncien},{id:"roulement_av_change",label:"Roulement avant changé",type:"oui_non",required:false,groupe:"roulement_av_pair",condition:siAncien},
    {id:"etat_flasque_av",label:"État visuel flasque avant",type:"select",options:["OK","Marqué"],required:true,groupe:"visuel_av_pair",condition:siAncien},
    {id:"etat_arbre_av",label:"État visuel arbre avant",type:"select",options:["OK","Marqué"],required:true,groupe:"visuel_av_pair",condition:siAncien},
    {id:"mesure_flasque_av",label:"Mesure flasque avant",type:"number",unite:"mm",required:true,groupe:"flasque_av",condition:siAncien},
    {id:"mesure_arbre_av",label:"Mesure arbre avant",type:"number",unite:"mm",required:true,groupe:"flasque_av",condition:siAncien},
    {id:"joint_av",label:"Joints avant",type:"joints",required:false,groupe:"joint_av",condition:siAncien},
    {id:"type_roulement_ar",label:"Type roulement arrière",type:"roulement",required:true,condition:siAncien},
    {id:"etat_roulement_ar",label:"État roulement arrière",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,groupe:"roulement_ar_pair",condition:siAncien},{id:"roulement_ar_change",label:"Roulement arrière changé",type:"oui_non",required:false,groupe:"roulement_ar_pair",condition:siAncien},
    {id:"etat_flasque_ar",label:"État visuel flasque arrière",type:"select",options:["OK","Marqué"],required:true,groupe:"visuel_ar_pair",condition:siAncien},
    {id:"etat_arbre_ar",label:"État visuel arbre arrière",type:"select",options:["OK","Marqué"],required:true,groupe:"visuel_ar_pair",condition:siAncien},
    {id:"mesure_flasque_ar",label:"Mesure flasque arrière",type:"number",unite:"mm",required:true,groupe:"flasque_ar",condition:siAncien},
    {id:"mesure_arbre_ar",label:"Mesure arbre arrière",type:"number",unite:"mm",required:true,groupe:"flasque_ar",condition:siAncien},
    {id:"joint_ar",label:"Joints arrière",type:"joints",required:false,groupe:"joint_ar",condition:siAncien},
    {id:"peinture",label:"Peinture à faire",type:"oui_non",required:true,condition:siAncien},
    {id:"etat_bobinage",label:"État visuel bobinage",type:"select",options:["RAS","Cuit","Sale","Vieux","HS"],required:true,groupe:"bob_rotor",condition:siAncien},
    {id:"etat_rotor",label:"État visuel rotor",type:"select",options:["RAS","Bleui","HS","Autre"],required:false,autreTexte:true,groupe:"bob_rotor",condition:siAncien},
    {id:"skf_av_dem",label:"Screen SKF avant démontage",type:"photo_skf",categorie:"Screen SKF avant au démontage",required:false,condition:siAncien},{id:"skf_ar_dem",label:"Screen SKF arrière démontage",type:"photo_skf",categorie:"Screen SKF arrière au démontage",required:false,condition:siAncien},{id:"tech_demontage",label:"Qui a démonté",type:"technicien",required:true,condition:siAncien},
    {id:"marque_moteur_neuf",label:"Marque du moteur",type:"select",options:MARQUES_MOTEUR,required:false,autreTexte:true,condition:siNeuf,groupe:"neuf_marque_puiss"},
    {id:"puissance_moteur_neuf",label:"Puissance du moteur",type:"text",unite:"kW",required:false,condition:siNeuf,groupe:"neuf_marque_puiss"},
    {id:"vitesse_moteur_neuf",label:"Vitesse du moteur",type:"text",unite:"tr/mn",required:false,condition:siNeuf,groupe:"neuf_vit_type"},
    {id:"type_moteur_neuf",label:"Type du moteur",type:"text",required:false,condition:siNeuf,groupe:"neuf_vit_type"},
    {id:"numero_serie_moteur_neuf",label:"N° de série",type:"text",required:false,condition:siNeuf},
    {id:"travaux_conseille",label:"Travaux conseillé/à effectuer",type:"text",required:true,dictee:true},
  ],
  "Information des essais après remontage":[
    {id:"tech_remontage",label:"Qui a remonté",type:"technicien",required:true},
    {id:"essai_vide_apres",label:"Essai à vide possible",type:"select",options:["Oui","Non"],required:true},
    {id:"essai_vide_apres_pourquoi",label:"Pourquoi essai à vide impossible",type:"text",required:true,dictee:true,condition:{champ:"essai_vide_apres",valeur:"Non"}},
    {id:"int_p1_apres",label:"Intensité Phase 1",type:"mesure",unite:"A",required:true,groupe:"int_apres"},
    {id:"int_p2_apres",label:"Intensité Phase 2",type:"mesure",unite:"A",required:true,groupe:"int_apres"},
    {id:"int_p3_apres",label:"Intensité Phase 3",type:"mesure",unite:"A",required:true,groupe:"int_apres"},
    {id:"int_560_p1_apres",label:"Intensité 560V — Ph.1",type:"mesure",unite:"A",required:false,groupe:"int560_apres"},
    {id:"int_560_p2_apres",label:"Intensité 560V — Ph.2",type:"mesure",unite:"A",required:false,groupe:"int560_apres"},
    {id:"int_560_p3_apres",label:"Intensité 560V — Ph.3",type:"mesure",unite:"A",required:false,groupe:"int560_apres"},
    {id:"vib_av_mms_apres",label:"Vibration avant — mm/s",type:"mesure",unite:"mm/s",required:true,groupe:"vib_av_apres"},
    {id:"vib_av_ge_apres",label:"Vibration avant — GE",type:"mesure",unite:"GE",required:true,groupe:"vib_av_apres"},
    {id:"vib_ar_mms_apres",label:"Vibration arrière — mm/s",type:"mesure",unite:"mm/s",required:true,groupe:"vib_ar_apres"},
    {id:"vib_ar_ge_apres",label:"Vibration arrière — GE",type:"mesure",unite:"GE",required:true,groupe:"vib_ar_apres"},
    {id:"skf_av_rem",label:"Screen SKF avant remontage",type:"photo_skf",categorie:"Screen SKF avant au remontage",required:false},{id:"skf_ar_rem",label:"Screen SKF arrière remontage",type:"photo_skf",categorie:"Screen SKF arrière au remontage",required:false},{id:"resserage_plaque",label:"Resserrage plaque à bornes",type:"text",required:false,dictee:true},{id:"tech_essai",label:"Qui a essayé",type:"technicien",required:true},
    {id:"travaux_effectue",label:"Travaux effectué",type:"text",required:true,dictee:true},
  ],
}

const ETAPES_POMPE=["Entrée","Infos électriques","Rotation avant démontage moteur","Rotation avant démontage pompe","Matériel au démontage moteur","Mécanique pompe au démontage","Essais après remontage"];

const GM_MOBILE_OPTIONS=["NTK","NTKG","NTL","NTLG","NTB","NTBG","Autre"];
const GM_FIXE_OPTIONS=["CNK","Autre"];

const CHAMPS_POMPE={
  "Entrée":[
    {id:"date_entree",label:"Date d'entrée",type:"date",required:true,groupe:"entree_de"},
    {id:"client",label:"Client",type:"client",required:true},
    {id:"de",label:"N° DE",type:"text",required:true,groupe:"entree_de"},
    {id:"delai_valeur",label:"Délai demandé par le client",type:"number",required:true,groupe:"delai_pair"},
    {id:"delai_unite",label:"Unité",type:"select",options:["Jours","Semaine(s)","Mois"],required:true,groupe:"delai_pair"},
    {id:"mail",label:"Mail du client",type:"text",required:true,groupe:"mail_tel"},
    {id:"telephone",label:"Téléphone",type:"text",required:true,groupe:"mail_tel"},
    {id:"materiel_lieu",label:"Matériel / Identification lieux",type:"text",required:true},
    {id:"marque_moteur",label:"Marque moteur",type:"select",options:["WEG","ABB","Siemens","Leroy Sommer","Nidec","Autre"],required:false,autreTexte:true},
    {id:"puissance",label:"Puissance",type:"text",required:false,unite:"kW",groupe:"puiss_vit"},
    {id:"vitesse",label:"Vitesse",type:"select",options:["1000","1500","3000","Autre"],required:false,unite:"tr/mn",autreTexte:true,groupe:"puiss_vit"},
    {id:"type_moteur",label:"Type moteur",type:"text",required:false,groupe:"type_serie_moteur"},
    {id:"numero_serie",label:"Numéro de série moteur",type:"text",required:false,groupe:"type_serie_moteur"},
    {id:"fixation",label:"Fixation",type:"select",options:["B3 (pattes)","B5 (bride)","B14","Spécial"],required:false,autreTexte:true},
    {id:"marque_pompe",label:"Marque pompe",type:"select",options:["Grundfos","KSB","LOWARA","WILO","XYLEM","FYGT","SALMSON","SIHI","SEEPEX","Autre"],required:false,autreTexte:true},
    {id:"modele_pompe",label:"Modèle / Référence pompe",type:"text",required:false,groupe:"pompe_modele_serie"},
    {id:"numero_serie_pompe",label:"Numéro de série pompe",type:"text",required:false,groupe:"pompe_modele_serie"},
    {id:"debit_nominal",label:"Débit nominal",type:"text",required:false,groupe:"debit_pression"},
    {id:"pression_nominale",label:"Pression nominale",type:"text",required:false,groupe:"debit_pression"},
    {id:"type_fluide",label:"Type de fluide pompé",type:"text",required:false,groupe:"fluide_temp"},
    {id:"temperature_fluide",label:"Température fluide",type:"number",required:false,unite:"°C",groupe:"fluide_temp"},
    {id:"tension",label:"Tension",type:"select",options:["230/400","400/690","Autre"],required:true,unite:"V",autreTexte:true},
    {id:"depose_nos_soins",label:"Déposé par nos soins",type:"oui_non",required:true},
    {id:"enleve_nos_soins",label:"Enlevé par nos soins",type:"oui_non",required:true},
    {id:"tech_entree",label:"Technicien",type:"technicien",required:true},
    {id:"demande_client",label:"Demande client",type:"text",required:true,dictee:true},
  ],
  "Infos électriques":[
    {id:"sur_variateur",label:"Sur variateur",type:"oui_non",required:true},
    {id:"couplage",label:"Couplage",type:"select",options:["Étoile","Triangle","Absent"],required:true},
    {id:"isol_masse",label:"Isol. masse",type:"ohm",required:true,groupe:"isol_masse_pair"},{id:"isol_masse_dar",label:"DAR masse",type:"number",unite:"DAR",required:false,groupe:"isol_masse_pair"},{id:"isol_uv",label:"Isol. U-V",type:"ohm",required:true,groupe:"isol_uv_pair"},{id:"isol_uv_dar",label:"DAR U-V",type:"number",unite:"DAR",required:false,groupe:"isol_uv_pair"},{id:"isol_vw",label:"Isol. V-W",type:"ohm",required:true,groupe:"isol_vw_pair"},{id:"isol_vw_dar",label:"DAR V-W",type:"number",unite:"DAR",required:false,groupe:"isol_vw_pair"},{id:"isol_wu",label:"Isol. W-U",type:"ohm",required:true,groupe:"isol_wu_pair"},{id:"isol_wu_dar",label:"DAR W-U",type:"number",unite:"DAR",required:false,groupe:"isol_wu_pair"},
    {id:"adx_resultat_var",label:"ADX mesure isol. avec variateur 2800V — résultat",type:"select",options:["PASS","Douteux","Hors Tolérance"],required:true,condition:{champ:"sur_variateur",valeur:"Oui"}},
    {id:"adx_valeur_var",label:"ADX mesure isol. avec variateur 2800V — valeur",type:"ohm",required:true,condition:{champ:"sur_variateur",valeur:"Oui"}},
    {id:"adx_resultat_novar",label:"ADX mesure isol. sans variateur 2000V — résultat",type:"select",options:["PASS","Douteux","Hors Tolérance"],required:true,condition:{champ:"sur_variateur",valeur:"Non"}},
    {id:"adx_valeur_novar",label:"ADX mesure isol. sans variateur 2000V — valeur",type:"ohm",required:true,condition:{champ:"sur_variateur",valeur:"Non"}},
    {id:"plaque_bornes_etat",label:"Plaque à bornes — état",type:"select",options:["OK","HS"],required:true},
    {id:"plaque_bornes_taille",label:"Plaque à bornes — taille",type:"text",required:true,condition:{champ:"plaque_bornes_etat",valeur:"HS"}},
    {id:"sonde_presence",label:"Résistance sonde — présence",type:"select",options:["Absente","Présente"],required:true},
    {id:"sonde_valeur",label:"Résistance sonde — valeur",type:"mesure",unite:"Ω",required:true,condition:{champ:"sonde_presence",valeur:"Présente"}},
    {id:"tech_elec",label:"Technicien",type:"technicien",required:true},
    {id:"conclusion",label:"Conclusion",type:"text",required:true,dictee:true},
  ],
  "Rotation avant démontage moteur":[
    {id:"essai_vide_avant_m",label:"Essai à vide possible",type:"select",options:["Oui","Non"],required:true},
    {id:"essai_vide_avant_m_pourquoi",label:"Pourquoi essai à vide impossible",type:"text",required:true,dictee:true,condition:{champ:"essai_vide_avant_m",valeur:"Non"}},
    {id:"rotor_cc_realise_m",label:"Vérif rotor court-circuit — réalisée",type:"select",options:["Oui","Non"],required:true},
    {id:"rotor_cc_resultat_m",label:"Vérif rotor court-circuit — résultat",type:"select",options:["OK","HS"],required:true,condition:{champ:"rotor_cc_realise_m",valeur:"Oui"}},
    {id:"int_p1_avant_m",label:"Intensité Phase 1",type:"mesure",unite:"A",required:true,groupe:"int_avant_m"},
    {id:"int_p2_avant_m",label:"Intensité Phase 2",type:"mesure",unite:"A",required:true,groupe:"int_avant_m"},
    {id:"int_p3_avant_m",label:"Intensité Phase 3",type:"mesure",unite:"A",required:true,groupe:"int_avant_m"},
    {id:"vib_av_mms_avant_m",label:"Vibration avant à 400V — mm/s",type:"mesure",unite:"mm/s",required:true,groupe:"vib_avant_m"},
    {id:"vib_av_ge_avant_m",label:"Vibration avant à 400V — GE",type:"mesure",unite:"GE",required:true,groupe:"vib_avant_m"},
    {id:"vib_ar_mms_avant_m",label:"Vibration arrière à 400V — mm/s",type:"mesure",unite:"mm/s",required:true,groupe:"vib_arriere_m"},
    {id:"vib_ar_ge_avant_m",label:"Vibration arrière à 400V — GE",type:"mesure",unite:"GE",required:true,groupe:"vib_arriere_m"},
    {id:"skf_av_rot_m",label:"Screen SKF avant rotation",type:"photo_skf",categorie:"Screen SKF avant au démontage",required:false},{id:"skf_ar_rot_m",label:"Screen SKF arrière rotation",type:"photo_skf",categorie:"Screen SKF arrière au démontage",required:false},
    {id:"int_560_p1_avant_m",label:"Intensité 560V — Ph.1",type:"mesure",unite:"A",required:false,groupe:"int560_avant_m"},
    {id:"int_560_p2_avant_m",label:"Intensité 560V — Ph.2",type:"mesure",unite:"A",required:false,groupe:"int560_avant_m"},
    {id:"int_560_p3_avant_m",label:"Intensité 560V — Ph.3",type:"mesure",unite:"A",required:false,groupe:"int560_avant_m"},
    {id:"nettoyage_hp_m",label:"Nettoyage HP",type:"select",options:["Oui","Non"],required:true},
    {id:"etuvage_stator_m",label:"Étuvage du stator",type:"select",options:["Oui","Non"],required:true},
    {id:"isol_masse_hp_m",label:"Mesure isolement masse (suite HP)",type:"ohm",required:true,condition:{champ:"etuvage_stator_m",valeur:"Oui"}},
    {id:"isol_enroul_min_m",label:"Isolement enroulements — plus petite valeur",type:"ohm",required:true},
    {id:"tech_mesure_avant_m",label:"Qui a mesuré",type:"technicien",required:true},
  ],
  "Rotation avant démontage pompe":[
    {id:"essai_vide_avant_p",label:"Essai à vide possible",type:"select",options:["Oui","Non"],required:true},
    {id:"essai_vide_avant_p_pourquoi",label:"Pourquoi essai à vide impossible",type:"text",required:true,dictee:true,condition:{champ:"essai_vide_avant_p",valeur:"Non"}},
    {id:"int_p1_avant_p",label:"Intensité Phase 1",type:"mesure",unite:"A",required:true,groupe:"int_avant_p"},
    {id:"int_p2_avant_p",label:"Intensité Phase 2",type:"mesure",unite:"A",required:false,groupe:"int_avant_p"},
    {id:"int_p3_avant_p",label:"Intensité Phase 3",type:"mesure",unite:"A",required:false,groupe:"int_avant_p"},
    {id:"int_560_p1_avant_p",label:"Intensité 560V — Ph.1",type:"mesure",unite:"A",required:false,groupe:"int560_avant_p"},
    {id:"int_560_p2_avant_p",label:"Intensité 560V — Ph.2",type:"mesure",unite:"A",required:false,groupe:"int560_avant_p"},
    {id:"int_560_p3_avant_p",label:"Intensité 560V — Ph.3",type:"mesure",unite:"A",required:false,groupe:"int560_avant_p"},
    {id:"pression_essai_avant",label:"Essai en eau / air",type:"select",options:["Eau","Air"],required:true},
    {id:"pression_nom_max",label:"Pression nominale max",type:"mesure",unite:"bar",required:true,groupe:"pression_pompe_pair"},
    {id:"pression_courbe_0",label:"Pression max débit nul",type:"mesure",unite:"bar",required:true,groupe:"pression_pompe_pair"},
    {id:"pression_ville",label:"Pression de ville",type:"mesure",unite:"bar",required:true,groupe:"delta_p"},
    {id:"pression_pompe",label:"Pression de pompe",type:"mesure",unite:"bar",required:true,groupe:"delta_p"},
    {id:"delta_p_result",label:"Delta P (calculé auto)",type:"calcul",required:false,calcul:"pression_pompe-pression_ville",unite:"bar",groupe:"delta_p_pair"},
    {id:"delta_p_etat",label:"Delta P — état",type:"select",options:["OK","HS"],required:true,groupe:"delta_p_pair"},
    {id:"diametre_nez_roue",label:"Diamètre nez de roue",type:"mesure",unite:"mm",required:true,groupe:"dim_roue"},
    {id:"diametre_volute",label:"Diamètre volute intérieur",type:"mesure",unite:"mm",required:true,groupe:"dim_roue"},
    {id:"tech_mesure_avant_p",label:"Qui a mesuré",type:"technicien",required:true},
  ],
  "Matériel au démontage moteur":[
    {id:"moteur_neuf",label:"Moteur neuf",type:"oui_non",required:true},
    {id:"ventilateur_present",label:"Présence d\'un ventilateur",type:"oui_non",required:true,condition:siAncien},
    {id:"circlips_avant",label:"Circlips avant",type:"text",required:false,groupe:"circlips",condition:siAncien},
    {id:"circlips_arriere",label:"Circlips arrière",type:"text",required:false,groupe:"circlips",condition:siAncien},
    {id:"rondelle_presence",label:"Rondelle souplesse — présence",type:"select",options:["Oui","Non"],required:false,condition:siAncien},
    {id:"rondelle_avant",label:"Rondelle souplesse avant",type:"select",options:["Oui","Non"],required:false,condition:v=>siAncien(v)&&v.rondelle_presence==="Oui",groupe:"rondelle_pair"},
    {id:"rondelle_arriere",label:"Rondelle souplesse arrière",type:"select",options:["Oui","Non"],required:false,condition:v=>siAncien(v)&&v.rondelle_presence==="Oui",groupe:"rondelle_pair"},
    {id:"etat_ventilateur",label:"État ventilateur",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,condition:v=>siAncien(v)&&v.ventilateur_present==="Oui",groupe:"ventilateur_pair"},
    {id:"taille_ventilateur",label:"Taille ventilateur",type:"text",required:false,condition:v=>siAncien(v)&&v.ventilateur_present==="Oui",groupe:"ventilateur_pair"},
    {id:"type_roulement_av",label:"Type roulement avant",type:"roulement",required:true,condition:siAncien},
    {id:"etat_roulement_av",label:"État roulement avant",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,groupe:"roulement_av_pair",condition:siAncien},{id:"roulement_av_change",label:"Roulement avant changé",type:"oui_non",required:false,groupe:"roulement_av_pair",condition:siAncien},
    {id:"etat_flasque_av",label:"État visuel flasque avant",type:"select",options:["OK","Marqué"],required:true,groupe:"visuel_av_pair",condition:siAncien},
    {id:"etat_arbre_av",label:"État visuel arbre avant",type:"select",options:["OK","Marqué"],required:true,groupe:"visuel_av_pair",condition:siAncien},
    {id:"mesure_flasque_av",label:"Mesure flasque avant",type:"number",unite:"mm",required:true,groupe:"flasque_av",condition:siAncien},
    {id:"mesure_arbre_av",label:"Mesure arbre avant",type:"number",unite:"mm",required:true,groupe:"flasque_av",condition:siAncien},
    {id:"joint_av",label:"Joints avant",type:"joints",required:false,groupe:"joint_av",condition:siAncien},
    {id:"type_roulement_ar",label:"Type roulement arrière",type:"roulement",required:true,condition:siAncien},
    {id:"etat_roulement_ar",label:"État roulement arrière",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,groupe:"roulement_ar_pair",condition:siAncien},{id:"roulement_ar_change",label:"Roulement arrière changé",type:"oui_non",required:false,groupe:"roulement_ar_pair",condition:siAncien},
    {id:"etat_flasque_ar",label:"État visuel flasque arrière",type:"select",options:["OK","Marqué"],required:true,groupe:"visuel_ar_pair",condition:siAncien},
    {id:"etat_arbre_ar",label:"État visuel arbre arrière",type:"select",options:["OK","Marqué"],required:true,groupe:"visuel_ar_pair",condition:siAncien},
    {id:"mesure_flasque_ar",label:"Mesure flasque arrière",type:"number",unite:"mm",required:true,groupe:"flasque_ar",condition:siAncien},
    {id:"mesure_arbre_ar",label:"Mesure arbre arrière",type:"number",unite:"mm",required:true,groupe:"flasque_ar",condition:siAncien},
    {id:"joint_ar",label:"Joints arrière",type:"joints",required:false,groupe:"joint_ar",condition:siAncien},
    {id:"peinture",label:"Peinture à faire",type:"oui_non",required:true,condition:siAncien},
    {id:"etat_bobinage",label:"État visuel bobinage",type:"select",options:["RAS","Cuit","Sale","Vieux","HS"],required:true,groupe:"bob_rotor",condition:siAncien},
    {id:"etat_rotor",label:"État visuel rotor",type:"select",options:["RAS","Bleui","HS","Autre"],required:false,autreTexte:true,groupe:"bob_rotor",condition:siAncien},
    {id:"tech_demontage_m",label:"Qui a démonté",type:"technicien",required:true,condition:siAncien},
    {id:"marque_moteur_neuf",label:"Marque du moteur",type:"select",options:MARQUES_MOTEUR,required:false,autreTexte:true,condition:siNeuf,groupe:"neuf_marque_puiss"},
    {id:"puissance_moteur_neuf",label:"Puissance du moteur",type:"text",unite:"kW",required:false,condition:siNeuf,groupe:"neuf_marque_puiss"},
    {id:"vitesse_moteur_neuf",label:"Vitesse du moteur",type:"text",unite:"tr/mn",required:false,condition:siNeuf,groupe:"neuf_vit_type"},
    {id:"type_moteur_neuf",label:"Type du moteur",type:"text",required:false,condition:siNeuf,groupe:"neuf_vit_type"},
    {id:"numero_serie_moteur_neuf",label:"N° de série",type:"text",required:false,condition:siNeuf},
  ],
  "Mécanique pompe au démontage":[
    {id:"pompe_neuve",label:"Pompe neuve",type:"oui_non",required:true},
    {id:"etat_jc",label:"État du joint de corps",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,condition:siPompeAncienne},
    {id:"matiere_taille_jc",label:"Matière et taille du joint de corps",type:"text",required:true,condition:siPompeAncienne},
    {id:"remplacement_jc",label:"Remplacement du joint de corps",type:"oui_non",required:true,condition:siPompeAncienne},
    {id:"type_gm_fixe",label:"Type GM fixe",type:"garniture_fixe",required:true,groupe:"gm_fixe_type_diam",condition:siPompeAncienne},
    {id:"diametre_gm_fixe",label:"Diamètre arbre GM fixe",type:"number",unite:"mm",required:true,groupe:"gm_fixe_type_diam",condition:siPompeAncienne},
    {id:"etat_gm_fixe",label:"État GM fixe",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,groupe:"gm_fixe_etat_diam",condition:siPompeAncienne},
    {id:"diametre_portee_fixe",label:"Diamètre de la portée GM fixe",type:"mesure",unite:"mm",required:true,groupe:"gm_fixe_etat_diam",condition:siPompeAncienne},
    {id:"type_gm_mobile",label:"Type GM mobile",type:"garniture_mobile",required:true,groupe:"gm_mobile_type_diam",condition:siPompeAncienne},
    {id:"diametre_gm_mobile",label:"Diamètre arbre GM mobile",type:"number",unite:"mm",required:true,groupe:"gm_mobile_type_diam",condition:siPompeAncienne},
    {id:"etat_gm_mobile",label:"État GM mobile",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,condition:siPompeAncienne},
    {id:"type_roulement_av_p",label:"Type roulement avant pompe",type:"roulement",required:true,condition:siPompeAncienne},
    {id:"etat_roulement_av_p",label:"État roulement avant pompe",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,groupe:"roulement_av_p_pair",condition:siPompeAncienne},{id:"roulement_av_p_change",label:"Roulement avant pompe changé",type:"oui_non",required:false,groupe:"roulement_av_p_pair",condition:siPompeAncienne},
    {id:"joint_av_p",label:"Joints avant pompe",type:"joints",required:false,groupe:"joint_av_p",condition:siPompeAncienne},
    {id:"type_roulement_ar_p",label:"Type roulement arrière pompe",type:"roulement",required:true,condition:siPompeAncienne},
    {id:"etat_roulement_ar_p",label:"État roulement arrière pompe",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,groupe:"roulement_ar_p_pair",condition:siPompeAncienne},{id:"roulement_ar_p_change",label:"Roulement arrière pompe changé",type:"oui_non",required:false,groupe:"roulement_ar_p_pair",condition:siPompeAncienne},
    {id:"joint_ar_p",label:"Joints arrière pompe",type:"joints",required:false,groupe:"joint_ar_p",condition:siPompeAncienne},
    {id:"tech_demontage_p",label:"Qui a démonté la pompe",type:"technicien",required:true,condition:siPompeAncienne},
    {id:"marque_pompe_neuve",label:"Marque de pompe",type:"select",options:MARQUES_POMPE,required:false,autreTexte:true,condition:siPompeNeuve,groupe:"pneuve_marque_puiss"},
    {id:"puissance_pompe_neuve",label:"Puissance",type:"text",unite:"kW",required:false,condition:siPompeNeuve,groupe:"pneuve_marque_puiss"},
    {id:"numero_serie_pompe_neuve",label:"N° de série",type:"text",required:false,condition:siPompeNeuve,groupe:"pneuve_serie_type"},
    {id:"type_pompe_neuve",label:"Type de pompe",type:"text",required:false,condition:siPompeNeuve,groupe:"pneuve_serie_type"},
    {id:"travaux_conseille",label:"Travaux conseillé/à effectuer",type:"text",required:true,dictee:true},
  ],
  "Essais après remontage":[
    {id:"tech_remontage",label:"Qui a remonté",type:"technicien",required:true},
    {id:"essai_vide_apres",label:"Essai à vide possible",type:"select",options:["Oui","Non"],required:true},
    {id:"essai_vide_apres_pourquoi",label:"Pourquoi essai à vide impossible",type:"text",required:true,dictee:true,condition:{champ:"essai_vide_apres",valeur:"Non"}},
    {id:"int_p1_apres",label:"Intensité Phase 1",type:"mesure",unite:"A",required:true,groupe:"int_apres"},
    {id:"int_p2_apres",label:"Intensité Phase 2",type:"mesure",unite:"A",required:true,groupe:"int_apres"},
    {id:"int_p3_apres",label:"Intensité Phase 3",type:"mesure",unite:"A",required:true,groupe:"int_apres"},
    {id:"int_560_p1_apres",label:"Intensité 560V — Ph.1",type:"mesure",unite:"A",required:false,groupe:"int560_apres"},
    {id:"int_560_p2_apres",label:"Intensité 560V — Ph.2",type:"mesure",unite:"A",required:false,groupe:"int560_apres"},
    {id:"int_560_p3_apres",label:"Intensité 560V — Ph.3",type:"mesure",unite:"A",required:false,groupe:"int560_apres"},
    {id:"vib_av_mms_apres",label:"Vibration avant — mm/s",type:"mesure",unite:"mm/s",required:true,groupe:"vib_av_apres"},
    {id:"vib_av_ge_apres",label:"Vibration avant — GE",type:"mesure",unite:"GE",required:true,groupe:"vib_av_apres"},
    {id:"vib_ar_mms_apres",label:"Vibration arrière — mm/s",type:"mesure",unite:"mm/s",required:true,groupe:"vib_ar_apres"},
    {id:"vib_ar_ge_apres",label:"Vibration arrière — GE",type:"mesure",unite:"GE",required:true,groupe:"vib_ar_apres"},
    {id:"skf_av_rem",label:"Screen SKF avant remontage",type:"photo_skf",categorie:"Screen SKF avant au remontage",required:false},{id:"skf_ar_rem",label:"Screen SKF arrière remontage",type:"photo_skf",categorie:"Screen SKF arrière au remontage",required:false},{id:"resserage_plaque",label:"Resserrage plaque à bornes",type:"text",required:false,dictee:true},{id:"tech_essai",label:"Qui a essayé",type:"technicien",required:true},
    {id:"pression_essai_apres",label:"Essai en eau / air",type:"select",options:["Eau","Air"],required:true},
    {id:"pression_nom_max_apres",label:"Pression nominale maximum",type:"mesure",unite:"bar",required:true,groupe:"pression_pompe_apres_pair"},
    {id:"pression_courbe_0_apres",label:"Pression max courbe à débit nul (0 m³/h)",type:"mesure",unite:"bar",required:true,groupe:"pression_pompe_apres_pair"},
    {id:"pression_ville_apres",label:"Pression de ville",type:"mesure",unite:"bar",required:true,groupe:"delta_p_apres"},
    {id:"pression_pompe_apres",label:"Pression de pompe",type:"mesure",unite:"bar",required:true,groupe:"delta_p_apres"},
    {id:"delta_p_result_apres",label:"Delta P (calculé auto)",type:"calcul",required:false,calcul:"pression_pompe_apres-pression_ville_apres",unite:"bar",groupe:"delta_p_apres_pair"},
    {id:"delta_p_etat_apres",label:"Delta P — état",type:"select",options:["OK","HS"],required:true,groupe:"delta_p_apres_pair"},
    {id:"diametre_nez_roue_apres",label:"Diamètre nez de roue",type:"mesure",unite:"mm",required:true,groupe:"dim_roue_apres"},
    {id:"diametre_volute_apres",label:"Diamètre volute intérieur",type:"mesure",unite:"mm",required:true,groupe:"dim_roue_apres"},
    {id:"vib_p_av_mms_apres",label:"Vibration avant — mm/s",type:"mesure",unite:"mm/s",required:true,groupe:"vib_p_avant_apres"},
    {id:"vib_p_av_ge_apres",label:"Vibration avant — GE",type:"mesure",unite:"GE",required:true,groupe:"vib_p_avant_apres"},
    {id:"vib_p_ar_mms_apres",label:"Vibration arrière — mm/s",type:"mesure",unite:"mm/s",required:true,groupe:"vib_p_arriere_apres"},
    {id:"vib_p_ar_ge_apres",label:"Vibration arrière — GE",type:"mesure",unite:"GE",required:true,groupe:"vib_p_arriere_apres"},
    {id:"travaux_effectue",label:"Travaux effectué",type:"text",required:true,dictee:true},
  ],
};;

const ETAPES_REDUCTEUR=["Entrée","Infos électriques","Rotation avant démontage moteur","Rotation avant démontage réducteur","Matériel au démontage moteur","Mécanique réducteur au démontage","Essais après remontage"];

const CHAMPS_REDUCTEUR={
  "Entrée":[
    {id:"date_entree",label:"Date d'entrée",type:"date",required:true,groupe:"entree_de"},
    {id:"client",label:"Client",type:"client",required:true},
    {id:"de",label:"N° DE",type:"text",required:true,groupe:"entree_de"},
    {id:"delai_valeur",label:"Délai demandé par le client",type:"number",required:true,groupe:"delai_pair"},
    {id:"delai_unite",label:"Unité",type:"select",options:["Jours","Semaine(s)","Mois"],required:true,groupe:"delai_pair"},
    {id:"mail",label:"Mail du client",type:"text",required:true,groupe:"mail_tel"},
    {id:"telephone",label:"Téléphone",type:"text",required:true,groupe:"mail_tel"},
    {id:"materiel_lieu",label:"Matériel / Identification lieux",type:"text",required:true},
    {id:"marque_moteur",label:"Marque moteur",type:"select",options:["WEG","ABB","Siemens","Leroy Sommer","Nidec","Autre"],required:false,autreTexte:true},
    {id:"puissance",label:"Puissance",type:"text",required:false,unite:"kW",groupe:"puiss_vit"},
    {id:"vitesse",label:"Vitesse",type:"select",options:["1000","1500","3000","Autre"],required:false,unite:"tr/mn",autreTexte:true,groupe:"puiss_vit"},
    {id:"type_moteur",label:"Type moteur",type:"text",required:false,groupe:"type_serie_moteur"},
    {id:"numero_serie",label:"Numéro de série moteur",type:"text",required:false,groupe:"type_serie_moteur"},
    {id:"fixation",label:"Fixation",type:"select",options:["B3 (pattes)","B5 (bride)","B14","Spécial"],required:false,autreTexte:true},
    {id:"marque_reducteur",label:"Marque réducteur",type:"select",options:MARQUES_REDUCTEUR,required:false,autreTexte:true},
    {id:"numero_serie_reducteur",label:"N° de série réducteur",type:"text",required:false,groupe:"reducteur_serie_modele"},
    {id:"modele_reducteur",label:"Modèle / Référence réducteur",type:"text",required:false,groupe:"reducteur_serie_modele"},
    {id:"type_reducteur",label:"Type de réducteur",type:"select",options:["À arbres parallèles","Coaxial","Roue et vis","À couple conique","Autre"],required:false,autreTexte:true,groupe:"reducteur_type_vitesse"},
    {id:"vitesse_sortie",label:"Vitesse de sortie",type:"text",unite:"tr/mn",required:false,orRequiredWith:"rapport_reduction",orRequiredLabel:"Rapport de réduction",groupe:"reducteur_type_vitesse"},
    {id:"rapport_reduction",label:"Rapport de réduction",type:"text",required:false,orRequiredWith:"vitesse_sortie",orRequiredLabel:"Vitesse de sortie"},
    {id:"tension",label:"Tension",type:"select",options:["230/400","400/690","Autre"],required:true,unite:"V",autreTexte:true},
    {id:"depose_nos_soins",label:"Déposé par nos soins",type:"oui_non",required:true},
    {id:"enleve_nos_soins",label:"Enlevé par nos soins",type:"oui_non",required:true},
    {id:"tech_entree",label:"Technicien",type:"technicien",required:true},
    {id:"demande_client",label:"Demande client",type:"text",required:true,dictee:true},
  ],
  "Infos électriques":[
    {id:"sur_variateur",label:"Sur variateur",type:"oui_non",required:true},
    {id:"couplage",label:"Couplage",type:"select",options:["Étoile","Triangle","Absent"],required:true},
    {id:"isol_masse",label:"Isol. masse",type:"ohm",required:true,groupe:"isol_masse_pair"},{id:"isol_masse_dar",label:"DAR masse",type:"number",unite:"DAR",required:false,groupe:"isol_masse_pair"},{id:"isol_uv",label:"Isol. U-V",type:"ohm",required:true,groupe:"isol_uv_pair"},{id:"isol_uv_dar",label:"DAR U-V",type:"number",unite:"DAR",required:false,groupe:"isol_uv_pair"},{id:"isol_vw",label:"Isol. V-W",type:"ohm",required:true,groupe:"isol_vw_pair"},{id:"isol_vw_dar",label:"DAR V-W",type:"number",unite:"DAR",required:false,groupe:"isol_vw_pair"},{id:"isol_wu",label:"Isol. W-U",type:"ohm",required:true,groupe:"isol_wu_pair"},{id:"isol_wu_dar",label:"DAR W-U",type:"number",unite:"DAR",required:false,groupe:"isol_wu_pair"},
    {id:"adx_resultat_var",label:"ADX mesure isol. avec variateur 2800V — résultat",type:"select",options:["PASS","Douteux","Hors Tolérance"],required:true,condition:{champ:"sur_variateur",valeur:"Oui"}},
    {id:"adx_valeur_var",label:"ADX mesure isol. avec variateur 2800V — valeur",type:"ohm",required:true,condition:{champ:"sur_variateur",valeur:"Oui"}},
    {id:"adx_resultat_novar",label:"ADX mesure isol. sans variateur 2000V — résultat",type:"select",options:["PASS","Douteux","Hors Tolérance"],required:true,condition:{champ:"sur_variateur",valeur:"Non"}},
    {id:"adx_valeur_novar",label:"ADX mesure isol. sans variateur 2000V — valeur",type:"ohm",required:true,condition:{champ:"sur_variateur",valeur:"Non"}},
    {id:"plaque_bornes_etat",label:"Plaque à bornes — état",type:"select",options:["OK","HS"],required:true},
    {id:"plaque_bornes_taille",label:"Plaque à bornes — taille",type:"text",required:true,condition:{champ:"plaque_bornes_etat",valeur:"HS"}},
    {id:"sonde_presence",label:"Résistance sonde — présence",type:"select",options:["Absente","Présente"],required:true},
    {id:"sonde_valeur",label:"Résistance sonde — valeur",type:"mesure",unite:"Ω",required:true,condition:{champ:"sonde_presence",valeur:"Présente"}},
    {id:"tech_elec",label:"Technicien",type:"technicien",required:true},
    {id:"conclusion",label:"Conclusion",type:"text",required:true,dictee:true},
  ],
  "Rotation avant démontage moteur":[
    {id:"essai_vide_avant_m",label:"Essai à vide possible",type:"select",options:["Oui","Non"],required:true},
    {id:"essai_vide_avant_m_pourquoi",label:"Pourquoi essai à vide impossible",type:"text",required:true,dictee:true,condition:{champ:"essai_vide_avant_m",valeur:"Non"}},
    {id:"rotor_cc_realise_m",label:"Vérif rotor court-circuit — réalisée",type:"select",options:["Oui","Non"],required:true},
    {id:"rotor_cc_resultat_m",label:"Vérif rotor court-circuit — résultat",type:"select",options:["OK","HS"],required:true,condition:{champ:"rotor_cc_realise_m",valeur:"Oui"}},
    {id:"int_p1_avant_m",label:"Intensité Phase 1",type:"mesure",unite:"A",required:true,groupe:"int_avant_m"},
    {id:"int_p2_avant_m",label:"Intensité Phase 2",type:"mesure",unite:"A",required:true,groupe:"int_avant_m"},
    {id:"int_p3_avant_m",label:"Intensité Phase 3",type:"mesure",unite:"A",required:true,groupe:"int_avant_m"},
    {id:"vib_av_mms_avant_m",label:"Vibration avant à 400V — mm/s",type:"mesure",unite:"mm/s",required:true,groupe:"vib_avant_m"},
    {id:"vib_av_ge_avant_m",label:"Vibration avant à 400V — GE",type:"mesure",unite:"GE",required:true,groupe:"vib_avant_m"},
    {id:"vib_ar_mms_avant_m",label:"Vibration arrière à 400V — mm/s",type:"mesure",unite:"mm/s",required:true,groupe:"vib_arriere_m"},
    {id:"vib_ar_ge_avant_m",label:"Vibration arrière à 400V — GE",type:"mesure",unite:"GE",required:true,groupe:"vib_arriere_m"},
    {id:"skf_av_rot_m",label:"Screen SKF avant rotation",type:"photo_skf",categorie:"Screen SKF avant au démontage",required:false},{id:"skf_ar_rot_m",label:"Screen SKF arrière rotation",type:"photo_skf",categorie:"Screen SKF arrière au démontage",required:false},
    {id:"int_560_p1_avant_m",label:"Intensité 560V — Ph.1",type:"mesure",unite:"A",required:false,groupe:"int560_avant_m"},
    {id:"int_560_p2_avant_m",label:"Intensité 560V — Ph.2",type:"mesure",unite:"A",required:false,groupe:"int560_avant_m"},
    {id:"int_560_p3_avant_m",label:"Intensité 560V — Ph.3",type:"mesure",unite:"A",required:false,groupe:"int560_avant_m"},
    {id:"nettoyage_hp_m",label:"Nettoyage HP",type:"select",options:["Oui","Non"],required:true},
    {id:"etuvage_stator_m",label:"Étuvage du stator",type:"select",options:["Oui","Non"],required:true},
    {id:"isol_masse_hp_m",label:"Mesure isolement masse (suite HP)",type:"ohm",required:true,condition:{champ:"etuvage_stator_m",valeur:"Oui"}},
    {id:"isol_enroul_min_m",label:"Isolement enroulements — plus petite valeur",type:"ohm",required:true},
    {id:"tech_mesure_avant_m",label:"Qui a mesuré",type:"technicien",required:true},
  ],
  "Rotation avant démontage réducteur":[
    {id:"essai_vide_avant_r",label:"Essai à vide possible",type:"select",options:["Oui","Non"],required:true},
    {id:"essai_vide_avant_r_pourquoi",label:"Pourquoi essai à vide impossible",type:"text",required:true,dictee:true,condition:{champ:"essai_vide_avant_r",valeur:"Non"}},
    {id:"int_p1_avant_r",label:"Intensité Phase 1",type:"mesure",unite:"A",required:true,groupe:"int_avant_r"},
    {id:"int_p2_avant_r",label:"Intensité Phase 2",type:"mesure",unite:"A",required:false,groupe:"int_avant_r"},
    {id:"int_p3_avant_r",label:"Intensité Phase 3",type:"mesure",unite:"A",required:false,groupe:"int_avant_r"},
    {id:"int_560_p1_avant_r",label:"Intensité 560V — Ph.1",type:"mesure",unite:"A",required:false,groupe:"int560_avant_r"},
    {id:"int_560_p2_avant_r",label:"Intensité 560V — Ph.2",type:"mesure",unite:"A",required:false,groupe:"int560_avant_r"},
    {id:"int_560_p3_avant_r",label:"Intensité 560V — Ph.3",type:"mesure",unite:"A",required:false,groupe:"int560_avant_r"},
    {id:"tech_mesure_avant_r",label:"Qui a mesuré",type:"technicien",required:true},
  ],
  "Matériel au démontage moteur":[
    {id:"moteur_neuf",label:"Moteur neuf",type:"oui_non",required:true},
    {id:"ventilateur_present",label:"Présence d\'un ventilateur",type:"oui_non",required:true,condition:siAncien},
    {id:"circlips_avant",label:"Circlips avant",type:"text",required:false,groupe:"circlips",condition:siAncien},
    {id:"circlips_arriere",label:"Circlips arrière",type:"text",required:false,groupe:"circlips",condition:siAncien},
    {id:"rondelle_presence",label:"Rondelle souplesse — présence",type:"select",options:["Oui","Non"],required:false,condition:siAncien},
    {id:"rondelle_avant",label:"Rondelle souplesse avant",type:"select",options:["Oui","Non"],required:false,condition:v=>siAncien(v)&&v.rondelle_presence==="Oui",groupe:"rondelle_pair"},
    {id:"rondelle_arriere",label:"Rondelle souplesse arrière",type:"select",options:["Oui","Non"],required:false,condition:v=>siAncien(v)&&v.rondelle_presence==="Oui",groupe:"rondelle_pair"},
    {id:"etat_ventilateur",label:"État ventilateur",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,condition:v=>siAncien(v)&&v.ventilateur_present==="Oui",groupe:"ventilateur_pair"},
    {id:"taille_ventilateur",label:"Taille ventilateur",type:"text",required:false,condition:v=>siAncien(v)&&v.ventilateur_present==="Oui",groupe:"ventilateur_pair"},
    {id:"type_roulement_av",label:"Type roulement avant",type:"roulement",required:true,condition:siAncien},
    {id:"etat_roulement_av",label:"État roulement avant",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,groupe:"roulement_av_pair",condition:siAncien},{id:"roulement_av_change",label:"Roulement avant changé",type:"oui_non",required:false,groupe:"roulement_av_pair",condition:siAncien},
    {id:"etat_flasque_av",label:"État visuel flasque avant",type:"select",options:["OK","Marqué"],required:true,groupe:"visuel_av_pair",condition:siAncien},
    {id:"etat_arbre_av",label:"État visuel arbre avant",type:"select",options:["OK","Marqué"],required:true,groupe:"visuel_av_pair",condition:siAncien},
    {id:"mesure_flasque_av",label:"Mesure flasque avant",type:"number",unite:"mm",required:true,groupe:"flasque_av",condition:siAncien},
    {id:"mesure_arbre_av",label:"Mesure arbre avant",type:"number",unite:"mm",required:true,groupe:"flasque_av",condition:siAncien},
    {id:"joint_av",label:"Joints avant",type:"joints",required:false,groupe:"joint_av",condition:siAncien},
    {id:"type_roulement_ar",label:"Type roulement arrière",type:"roulement",required:true,condition:siAncien},
    {id:"etat_roulement_ar",label:"État roulement arrière",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,groupe:"roulement_ar_pair",condition:siAncien},{id:"roulement_ar_change",label:"Roulement arrière changé",type:"oui_non",required:false,groupe:"roulement_ar_pair",condition:siAncien},
    {id:"etat_flasque_ar",label:"État visuel flasque arrière",type:"select",options:["OK","Marqué"],required:true,groupe:"visuel_ar_pair",condition:siAncien},
    {id:"etat_arbre_ar",label:"État visuel arbre arrière",type:"select",options:["OK","Marqué"],required:true,groupe:"visuel_ar_pair",condition:siAncien},
    {id:"mesure_flasque_ar",label:"Mesure flasque arrière",type:"number",unite:"mm",required:true,groupe:"flasque_ar",condition:siAncien},
    {id:"mesure_arbre_ar",label:"Mesure arbre arrière",type:"number",unite:"mm",required:true,groupe:"flasque_ar",condition:siAncien},
    {id:"joint_ar",label:"Joints arrière",type:"joints",required:false,groupe:"joint_ar",condition:siAncien},
    {id:"peinture",label:"Peinture à faire",type:"oui_non",required:true,condition:siAncien},
    {id:"etat_bobinage",label:"État visuel bobinage",type:"select",options:["RAS","Cuit","Sale","Vieux","HS"],required:true,groupe:"bob_rotor",condition:siAncien},
    {id:"etat_rotor",label:"État visuel rotor",type:"select",options:["RAS","Bleui","HS","Autre"],required:false,autreTexte:true,groupe:"bob_rotor",condition:siAncien},
    {id:"tech_demontage_m",label:"Qui a démonté",type:"technicien",required:true,condition:siAncien},
    {id:"marque_moteur_neuf",label:"Marque du moteur",type:"select",options:MARQUES_MOTEUR,required:false,autreTexte:true,condition:siNeuf,groupe:"neuf_marque_puiss"},
    {id:"puissance_moteur_neuf",label:"Puissance du moteur",type:"text",unite:"kW",required:false,condition:siNeuf,groupe:"neuf_marque_puiss"},
    {id:"vitesse_moteur_neuf",label:"Vitesse du moteur",type:"text",unite:"tr/mn",required:false,condition:siNeuf,groupe:"neuf_vit_type"},
    {id:"type_moteur_neuf",label:"Type du moteur",type:"text",required:false,condition:siNeuf,groupe:"neuf_vit_type"},
    {id:"numero_serie_moteur_neuf",label:"N° de série",type:"text",required:false,condition:siNeuf},
  ],
  "Mécanique réducteur au démontage":[
    {id:"reducteur_neuf",label:"Réducteur neuf",type:"oui_non",required:true},
    {id:"type_roulement_av_r",label:"Type roulement avant réducteur",type:"roulement",required:true,condition:siReducteurAncien},
    {id:"etat_roulement_av_r",label:"État roulement avant réducteur",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,groupe:"roulement_av_r_pair",condition:siReducteurAncien},{id:"roulement_av_r_change",label:"Roulement avant réducteur changé",type:"oui_non",required:false,groupe:"roulement_av_r_pair",condition:siReducteurAncien},
    {id:"joint_av_r",label:"Joints avant réducteur",type:"joints",required:false,groupe:"joint_av_r",condition:siReducteurAncien},
    {id:"type_roulement_ar_r",label:"Type roulement arrière réducteur",type:"roulement",required:true,condition:siReducteurAncien},
    {id:"etat_roulement_ar_r",label:"État roulement arrière réducteur",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,groupe:"roulement_ar_r_pair",condition:siReducteurAncien},{id:"roulement_ar_r_change",label:"Roulement arrière réducteur changé",type:"oui_non",required:false,groupe:"roulement_ar_r_pair",condition:siReducteurAncien},
    {id:"joint_ar_r",label:"Joints arrière réducteur",type:"joints",required:false,groupe:"joint_ar_r",condition:siReducteurAncien},
    {id:"roulements_autres",label:"Autres roulements",type:"roulements_liste",required:false,condition:siReducteurAncien},
    {id:"tech_demontage_r",label:"Qui a démonté le réducteur",type:"technicien",required:true,condition:siReducteurAncien},
    {id:"marque_reducteur_neuf",label:"Marque du réducteur",type:"select",options:MARQUES_REDUCTEUR,required:false,autreTexte:true,condition:siReducteurNeuf,groupe:"rneuve_marque_puiss"},
    {id:"puissance_reducteur_neuf",label:"Puissance",type:"text",unite:"kW",required:false,condition:siReducteurNeuf,groupe:"rneuve_marque_puiss"},
    {id:"numero_serie_reducteur_neuf",label:"N° de série",type:"text",required:false,condition:siReducteurNeuf,groupe:"rneuve_serie_type"},
    {id:"type_reducteur_neuf",label:"Type de réducteur",type:"text",required:false,condition:siReducteurNeuf,groupe:"rneuve_serie_type"},
    {id:"autres_pieces_reducteur",label:"Autres pièces détachées",type:"text",required:false,dictee:true},
    {id:"travaux_conseille",label:"Travaux conseillé/à effectuer",type:"text",required:true,dictee:true},
  ],
  "Essais après remontage":[
    {id:"tech_remontage",label:"Qui a remonté",type:"technicien",required:true},
    {id:"essai_vide_apres",label:"Essai à vide possible",type:"select",options:["Oui","Non"],required:true},
    {id:"essai_vide_apres_pourquoi",label:"Pourquoi essai à vide impossible",type:"text",required:true,dictee:true,condition:{champ:"essai_vide_apres",valeur:"Non"}},
    {id:"int_p1_apres",label:"Intensité Phase 1",type:"mesure",unite:"A",required:true,groupe:"int_apres"},
    {id:"int_p2_apres",label:"Intensité Phase 2",type:"mesure",unite:"A",required:true,groupe:"int_apres"},
    {id:"int_p3_apres",label:"Intensité Phase 3",type:"mesure",unite:"A",required:true,groupe:"int_apres"},
    {id:"int_560_p1_apres",label:"Intensité 560V — Ph.1",type:"mesure",unite:"A",required:false,groupe:"int560_apres"},
    {id:"int_560_p2_apres",label:"Intensité 560V — Ph.2",type:"mesure",unite:"A",required:false,groupe:"int560_apres"},
    {id:"int_560_p3_apres",label:"Intensité 560V — Ph.3",type:"mesure",unite:"A",required:false,groupe:"int560_apres"},
    {id:"vib_av_mms_apres",label:"Vibration avant — mm/s",type:"mesure",unite:"mm/s",required:true,groupe:"vib_av_apres"},
    {id:"vib_av_ge_apres",label:"Vibration avant — GE",type:"mesure",unite:"GE",required:true,groupe:"vib_av_apres"},
    {id:"vib_ar_mms_apres",label:"Vibration arrière — mm/s",type:"mesure",unite:"mm/s",required:true,groupe:"vib_ar_apres"},
    {id:"vib_ar_ge_apres",label:"Vibration arrière — GE",type:"mesure",unite:"GE",required:true,groupe:"vib_ar_apres"},
    {id:"skf_av_rem",label:"Screen SKF avant remontage",type:"photo_skf",categorie:"Screen SKF avant au remontage",required:false},{id:"skf_ar_rem",label:"Screen SKF arrière remontage",type:"photo_skf",categorie:"Screen SKF arrière au remontage",required:false},{id:"resserage_plaque",label:"Resserrage plaque à bornes",type:"text",required:false,dictee:true},{id:"tech_essai",label:"Qui a essayé",type:"technicien",required:true},
    {id:"vib_r_av_mms_apres",label:"Vibration avant réducteur — mm/s",type:"mesure",unite:"mm/s",required:true,groupe:"vib_r_avant_apres"},
    {id:"vib_r_av_ge_apres",label:"Vibration avant réducteur — GE",type:"mesure",unite:"GE",required:true,groupe:"vib_r_avant_apres"},
    {id:"vib_r_ar_mms_apres",label:"Vibration arrière réducteur — mm/s",type:"mesure",unite:"mm/s",required:true,groupe:"vib_r_arriere_apres"},
    {id:"vib_r_ar_ge_apres",label:"Vibration arrière réducteur — GE",type:"mesure",unite:"GE",required:true,groupe:"vib_r_arriere_apres"},
    {id:"travaux_effectue",label:"Travaux effectué",type:"text",required:true,dictee:true},
  ],
};;

function champVisible(c,v){if(!c.condition)return true;if(typeof c.condition==="function")return c.condition(v);return v[c.condition.champ]===c.condition.valeur;}
function etapeOk(nom,v,nr,cs){
  if(nr)return true;
  for(const c of((cs||CHAMPS)[nom]||[])){
    if(!champVisible(c,v))continue;
    if(c.required&&!v[c.id])return false;
    if(c.orRequiredWith&&!v[c.id]&&!v[c.orRequiredWith])return false;
  }
  return true;
}
function enErreur(c,val){if(c.type!=="mesure"||c.seuilMin==null)return false;const vv=parseFloat(val);return !isNaN(vv)&&vv<c.seuilMin;}
function today(){return new Date().toISOString().split("T")[0];}

// ─── Délai client / échéance (jours ouvrés = lundi-vendredi) ────────────
function estJourOuvre(date){const d=date.getDay();return d!==0&&d!==6;}
function ajouterJoursOuvres(date,n){const d=new Date(date);let c=0;while(c<n){d.setDate(d.getDate()+1);if(estJourOuvre(d))c++;}return d;}
function calculerEcheance(dateEntreeStr,valeur,unite){
  if(!dateEntreeStr||!valeur)return null;
  const n=parseFloat(valeur);
  if(isNaN(n)||n<=0)return null;
  const base=new Date(dateEntreeStr+"T00:00:00");
  if(isNaN(base.getTime()))return null;
  if(unite==="Semaine(s)"){base.setDate(base.getDate()+Math.round(n*7));return base;}
  if(unite==="Mois"){base.setMonth(base.getMonth()+Math.round(n));return base;}
  return ajouterJoursOuvres(base,Math.round(n));
}
function joursOuvresRestants(dateEcheance){
  const t=new Date();t.setHours(0,0,0,0);
  const cible=new Date(dateEcheance);cible.setHours(0,0,0,0);
  if(cible.getTime()<=t.getTime())return 0;
  const d=new Date(t);let c=0;
  while(d.getTime()<cible.getTime()){d.setDate(d.getDate()+1);if(estJourOuvre(d))c++;}
  return c;
}
function urgenceInfo(v){
  const ech=calculerEcheance(v.date_entree,v.delai_valeur,v.delai_unite);
  if(!ech)return null;
  const j=joursOuvresRestants(ech);
  const echStr=ech.toLocaleDateString("fr-FR");
  if(j<5)return{id:"urgent",label:"Urgent",color:"#D73A49",bg:"#FFF5F5",echeance:echStr,jours:j};
  if(j<10)return{id:"rapide",label:"À faire rapidement",color:"#CA8A04",bg:"#FFFBEB",echeance:echStr,jours:j};
  return{id:"ok",label:"À faire",color:"#22863A",bg:"#F0FFF4",echeance:echStr,jours:j};
}
function fmt(iso){if(!iso)return "—";return new Date(iso).toLocaleDateString("fr-FR");}
function slugCat(s){return s.toLowerCase().replace(/['\s]/g,"_").replace(/é|è|ê/g,"e").replace(/à|â/g,"a").replace(/[^a-z0-9_]/g,"");}
function slug(s){return (s||"").replace(/\s+/g,"_").replace(/[^a-zA-Z0-9_\-]/g,"").substring(0,30);}
function deSlug(de){return (de||"").replace(/-/g,"");}
function cheminFiche(v){const client=slug(v.client||"Client");const de=deSlug(v.de||"DE");const mat=slug(v.materiel_lieu||v.type_moteur||"Materiel");return {client,de,mat,chemin:client+"/"+de+"/"+mat};}
function statutInfo(id){return STATUTS_CHANTIER.find(s=>s.id===id)||STATUTS_CHANTIER[0];}
function useWidth(){const [w,setW]=useState(window.innerWidth);useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return w;}
function grilleCols(n,width){if(width<600)return 1;if(width>=900)return n;return Math.min(n,2);}

function fmtJoints(val){
  try{
    const arr=JSON.parse(val||"[]");
    if(!Array.isArray(arr)||arr.length===0)return "";
    return arr.map(function(x){
      if(x.type==="VA"||x.type==="VS")return x.type+(x.int||"?");
      return (x.int||"?")+"x"+(x.ext||"?")+"x"+(x.ep||"?")+" "+(x.type==="Double"?"DL":"SL");
    }).join(", ");
  }catch(e){return "";}
}
function detecterPieces(v,typeMat){
  const pieces=[];const mauvais=["Usé","HS","Cassé","Bleui","Cuit"];
  function ajouterJoints(champId,label){
    const txt=fmtJoints(v[champId]);
    if(txt)pieces.push({designation:label,reference:txt});
  }
  // Commun moteur
  if((v.etat_roulement_av&&mauvais.includes(v.etat_roulement_av))||v.roulement_av_change==="Oui")pieces.push({designation:"Roulement avant moteur",reference:(v.type_roulement_av||"").replace("Autre:","").trim()});
  if((v.etat_roulement_ar&&mauvais.includes(v.etat_roulement_ar))||v.roulement_ar_change==="Oui")pieces.push({designation:"Roulement arrière moteur",reference:(v.type_roulement_ar||"").replace("Autre:","").trim()});
  ajouterJoints("joint_av","Joint à lèvres avant moteur");
  ajouterJoints("joint_ar","Joint à lèvres arrière moteur");
  if(v.etat_ventilateur&&mauvais.includes(v.etat_ventilateur))pieces.push({designation:"Ventilateur",reference:v.taille_ventilateur||""});
  if(v.etat_bobinage&&mauvais.includes(v.etat_bobinage))pieces.push({designation:"Bobinage stator",reference:""});
  if(v.etat_rotor&&mauvais.includes(v.etat_rotor))pieces.push({designation:"Rotor",reference:""});
  // Spécifique pompe
  if(typeMat==="Pompe"){
    if(v.type_gm_fixe){
      const ref=(v.type_gm_fixe||"").replace("Autre:","").trim()+" "+(v.diametre_gm_fixe||"");
      pieces.push({designation:"GM fixe",reference:ref.trim()});
    }
    if(v.type_gm_mobile){
      const ref=(v.type_gm_mobile||"").replace("Autre:","").trim()+" "+(v.diametre_gm_mobile||"");
      pieces.push({designation:"GM mobile",reference:ref.trim()});
    }
    if((v.etat_roulement_av_p&&mauvais.includes(v.etat_roulement_av_p))||v.roulement_av_p_change==="Oui")pieces.push({designation:"Roulement avant pompe",reference:(v.type_roulement_av_p||"").replace("Autre:","").trim()});
    if((v.etat_roulement_ar_p&&mauvais.includes(v.etat_roulement_ar_p))||v.roulement_ar_p_change==="Oui")pieces.push({designation:"Roulement arrière pompe",reference:(v.type_roulement_ar_p||"").replace("Autre:","").trim()});
    ajouterJoints("joint_av_p","Joint à lèvres avant pompe");
    ajouterJoints("joint_ar_p","Joint à lèvres arrière pompe");
    if(v.remplacement_jc==="Oui")pieces.push({designation:"Joint de corps",reference:v.matiere_taille_jc||""});
  }
  // Spécifique réducteur
  if(typeMat==="Moto-réducteur"){
    if((v.etat_roulement_av_r&&mauvais.includes(v.etat_roulement_av_r))||v.roulement_av_r_change==="Oui")pieces.push({designation:"Roulement avant réducteur",reference:(v.type_roulement_av_r||"").replace("Autre:","").trim()});
    if((v.etat_roulement_ar_r&&mauvais.includes(v.etat_roulement_ar_r))||v.roulement_ar_r_change==="Oui")pieces.push({designation:"Roulement arrière réducteur",reference:(v.type_roulement_ar_r||"").replace("Autre:","").trim()});
    ajouterJoints("joint_av_r","Joint à lèvres avant réducteur");
    ajouterJoints("joint_ar_r","Joint à lèvres arrière réducteur");
    try{
      const autres=JSON.parse(v.roulements_autres||"[]");
      if(Array.isArray(autres))autres.forEach(function(r){
        if((r.etat&&mauvais.includes(r.etat))||r.change==="Oui")pieces.push({designation:"Roulement (autre) réducteur",reference:(r.type||"").replace("Autre:","").trim()});
      });
    }catch(e){}
  }
  return pieces;
}

const S={
  app:{fontFamily:"system-ui,-apple-system,sans-serif",background:"#F5F6F8",minHeight:"100vh",color:"#1A1A2E"},
  hdr:{background:"#1B4F8A",color:"#fff",padding:"8px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"},
  p1:{background:"#1B4F8A",color:"#fff",border:"none",padding:"9px 20px",borderRadius:6,fontWeight:600,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:6},
  p2:{background:"#fff",color:"#1B4F8A",border:"1.5px solid #1B4F8A",padding:"8px 18px",borderRadius:6,fontWeight:600,fontSize:14,cursor:"pointer"},
  pDanger:{background:"#D73A49",color:"#fff",border:"none",padding:"7px 14px",borderRadius:6,fontWeight:600,fontSize:13,cursor:"pointer"},
  card:{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"16px 20px",marginBottom:16},
  cAct:{background:"#fff",borderRadius:10,border:"2px solid #1B4F8A",padding:"16px 20px",marginBottom:16},
  cDone:{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",marginBottom:12,overflow:"hidden"},
  cLock:{background:"#F5F6F8",borderRadius:10,border:"1px solid #E2E6EA",padding:"12px 20px",marginBottom:12,opacity:0.5},
  lbl:{fontSize:11,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:3},
  inp:{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid #D1D5DB",fontSize:13,boxSizing:"border-box",background:"#fff"},
  inpErr:{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid #D73A49",fontSize:13,boxSizing:"border-box",background:"#FFF5F5"},
  sel:{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid #D1D5DB",fontSize:13,background:"#fff"},
  alert:{background:"#FFF5F5",border:"1.5px solid #D73A49",borderRadius:6,padding:"5px 9px",fontSize:11,color:"#D73A49",display:"flex",alignItems:"center",gap:5,marginTop:3},
  ok:{background:"#F0FFF4",border:"1px solid #22863A",borderRadius:6,padding:"8px 14px",fontSize:13,color:"#22863A",display:"flex",alignItems:"center",gap:8,marginBottom:14},
  info:{background:"#EEF4FF",border:"1px solid #1B4F8A",borderRadius:6,padding:"8px 14px",fontSize:13,color:"#1B4F8A",display:"flex",alignItems:"center",gap:8,marginBottom:14},
  tech:{background:"#EEF4FF",borderRadius:8,padding:"8px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:14},
  nr:{border:"1.5px solid #E2E6EA",borderRadius:8,padding:"8px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:14,cursor:"pointer"},
};

function ModalPin({onSuccess}){
  const [s,setS]=useState("");const [err,setErr]=useState(false);
  function tap(c){if(s.length>=4)return;const n=s+c;setS(n);if(n.length===4){if(n===PIN_CODE){localStorage.setItem(PIN_KEY,"1");onSuccess();}else{setErr(true);setTimeout(()=>{setS("");setErr(false);},800);}}}
  const touches=["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return(<div style={{position:"fixed",inset:0,background:"#1B4F8A",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
    <div style={{background:"#fff",borderRadius:16,padding:"32px 28px",width:300,textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,0.3)"}}>
      <img src={LOGO_B64} alt="PMV Services" style={{height:60,marginBottom:12,objectFit:"contain"}}/>
      <p style={{fontSize:13,color:"#6B7280",margin:"0 0 20px"}}>Entrez le code PIN</p>
      <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:24}}>
        {[0,1,2,3].map(i=><div key={i} style={{width:16,height:16,borderRadius:"50%",background:s.length>i?(err?"#D73A49":"#1B4F8A"):"#E2E6EA",transition:"background 0.15s"}}/>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {touches.map((t,i)=>t===""?<div key={i}/>:<button key={i} onClick={()=>t==="⌫"?setS(ss=>ss.slice(0,-1)):tap(t)} style={{padding:"14px",fontSize:18,fontWeight:600,borderRadius:10,border:"1.5px solid #E2E6EA",background:t==="⌫"?"#F5F6F8":"#fff",cursor:"pointer",color:t==="⌫"?"#6B7280":"#1A1A2E"}}>{t}</button>)}
      </div>
      {err&&<p style={{color:"#D73A49",fontSize:13,marginTop:12,fontWeight:600}}>Code incorrect</p>}
    </div>
  </div>);
}

function ChampClient({valeur,onChange,clients,onAddClient}){
  const [q,setQ]=useState(valeur||"");const [ouvert,setOuvert]=useState(false);const [modeAutre,setModeAutre]=useState(false);const ref=useRef(null);
  useEffect(()=>{function close(e){if(ref.current&&!ref.current.contains(e.target))setOuvert(false);}document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close);},[]);
  const filtres=q.length>0?clients.filter(c=>c.toLowerCase().includes(q.toLowerCase())):clients.slice(0,8);
  function select(c){if(c==="Autre"){setModeAutre(true);setQ("");onChange("");}else{setQ(c);onChange(c);setOuvert(false);setModeAutre(false);}}
  async function enregistrer(){if(!q.trim())return;try{await db.post("clients",{nom:q.trim()});onAddClient(q.trim());}catch(e){}onChange(q.trim());setModeAutre(false);setOuvert(false);}
  if(modeAutre)return(<div><div style={{display:"flex",gap:8}}><input type="text" value={q} onChange={e=>{setQ(e.target.value);onChange(e.target.value);}} placeholder="Nom du client..." style={{...S.inp,flex:1}}/><button onClick={enregistrer} style={{...S.p1,fontSize:12,padding:"6px 12px",whiteSpace:"nowrap"}}>+ Enregistrer</button><button onClick={()=>{setModeAutre(false);setQ("");}} style={{...S.p2,fontSize:12,padding:"6px 10px"}}>✕</button></div></div>);
  return(<div ref={ref} style={{position:"relative"}}>
    <input type="text" value={q} onChange={e=>{setQ(e.target.value);setOuvert(true);onChange(e.target.value);}} onFocus={()=>setOuvert(true)} placeholder="Tapez pour rechercher..." style={S.inp}/>
    {ouvert&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1.5px solid #D1D5DB",borderRadius:6,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:50,maxHeight:200,overflowY:"auto"}}>
      {filtres.map(c=><div key={c} onClick={()=>select(c)} style={{padding:"7px 12px",cursor:"pointer",fontSize:13,borderBottom:"1px solid #F3F4F6"}} onMouseOver={e=>e.currentTarget.style.background="#F5F6F8"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>{c}</div>)}
      <div onClick={()=>select("Autre")} style={{padding:"7px 12px",cursor:"pointer",fontSize:13,color:"#E8720C",fontWeight:600,borderTop:"1px solid #E2E6EA"}}>+ Autre (nouveau client)</div>
    </div>}
  </div>);
}

function ChampTechnicien({valeur,onChange,techs}){
  var isA=valeur&&!techs.filter(function(t){return t!=="Autre";}).includes(valeur);
  return(<div style={{display:"flex",flexDirection:"column",gap:6}}>
    <select value={isA?"Autre":(valeur||"")} onChange={function(e){if(e.target.value==="Autre")onChange("Autre:");else onChange(e.target.value);}} style={S.sel}>
      <option value="">{"Selectionner"}</option>
      {techs.map(function(t){return <option key={t} value={t}>{t}</option>;})}
    </select>
    {(isA||valeur?.startsWith("Autre:"))&&<input type="text" placeholder="Prenom Nom..." value={valeur?.replace("Autre:","")||""} onChange={function(e){onChange("Autre:"+e.target.value);}} style={S.inp}/>}
  </div>);
}

function ChampRoulement({valeur,onChange}){
  const isAutre=valeur&&!ROULEMENTS.slice(0,-1).includes(valeur);
  return(<div style={{display:"flex",flexDirection:"column",gap:6}}><select value={isAutre?"Autre":(valeur||"")} onChange={e=>{if(e.target.value==="Autre")onChange("Autre:");else onChange(e.target.value);}} style={S.sel}><option value="">— Sélectionner</option>{ROULEMENTS.map(r=><option key={r}>{r}</option>)}</select>{(isAutre||valeur?.startsWith("Autre:"))&&<input type="text" placeholder="Référence précise..." value={valeur?.replace("Autre:","")||""} onChange={e=>onChange("Autre:"+e.target.value)} style={S.inp}/>}</div>);
}


function ChampOhm({champId,valeur,onChange}){
  var parts=(valeur||"").split("_");
  var val=parts[0]||"";
  var unite=parts[1]||"GΩ";
  function upd(v,u){onChange(champId,(v||"")+"_"+(u||"GΩ"));}
  return(<div style={{display:"flex",gap:6,alignItems:"center"}}>
    <input type="number" value={val} onChange={function(e){upd(e.target.value,unite);}} style={{...S.inp,flex:1}} placeholder="Valeur"/>
    <select value={unite} onChange={function(e){upd(val,e.target.value);}} style={{...S.sel,width:72}}>
      <option value="kΩ">kΩ</option>
      <option value="MΩ">MΩ</option>
      <option value="GΩ">GΩ</option>
      <option value="TΩ">TΩ</option>
    </select>
  </div>);
}

function ChampJoints({champId,valeur,onChange}){
  function parse(v){try{return JSON.parse(v||"[]");}catch(e){return[];}}
  function save(arr){onChange(champId,JSON.stringify(arr));}
  var joints=parse(valeur);
  function addJ(){save(joints.concat([{type:"",int:"",ext:"",ep:""}]));}
  function delJ(n){save(joints.filter(function(_,j){return j!==n;}));}
  function updJ(n,f,v){save(joints.map(function(x,j){return j===n?Object.assign({},x,JSON.parse("{\""+f+"\":\""+v+"\"}")):x;}));}
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {joints.map(function(j,n){return(
        <div key={n} style={{border:"1px solid #E2E6EA",borderRadius:8,padding:"8px 10px",background:"#F8F9FA"}}>
          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:j.type?6:0}}>
            <select value={j.type||""} onChange={function(e){updJ(n,"type",e.target.value);}} style={{...S.sel,flex:1}}>
              <option value="">{"Type joint"}</option>
              <option value="VA">VA</option>
              <option value="VS">VS</option>
              <option value="Simple">{"Simple levre"}</option>
              <option value="Double">{"Double levre"}</option>
            </select>
            <button onClick={function(){delJ(n);}} style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:6,color:"#D73A49",padding:"4px 8px",cursor:"pointer",fontSize:12}}>{"X"}</button>
          </div>
          {(j.type==="VA"||j.type==="VS")&&(
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="number" placeholder="diam int" value={j.int||""} onChange={function(e){updJ(n,"int",e.target.value);}} style={{...S.inp,width:80}}/>
              <span style={{fontSize:12,color:"#1B4F8A",fontWeight:600}}>{j.type}{j.int||"?"}</span>
            </div>
          )}
          {(j.type==="Simple"||j.type==="Double")&&(
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              <input type="number" placeholder="int" value={j.int||""} onChange={function(e){updJ(n,"int",e.target.value);}} style={{...S.inp,width:65}}/>
              <span>{"x"}</span>
              <input type="number" placeholder="ext" value={j.ext||""} onChange={function(e){updJ(n,"ext",e.target.value);}} style={{...S.inp,width:65}}/>
              <span>{"x"}</span>
              <input type="number" placeholder="ep" value={j.ep||""} onChange={function(e){updJ(n,"ep",e.target.value);}} style={{...S.inp,width:55}}/>
              <span style={{fontSize:11,color:"#9CA3AF"}}>{j.type==="Double"?"DL":"SL"}</span>
            </div>
          )}
        </div>
      );})}
      <button onClick={addJ} style={{...S.p2,fontSize:12,padding:"6px 12px",color:"#22863A",borderColor:"#22863A"}}>{"+ Ajouter joint"}</button>
    </div>
  );
}

function ChampRoulementsListe({champId,valeur,onChange}){
  function parse(v){try{return JSON.parse(v||"[]");}catch(e){return[];}}
  function save(arr){onChange(champId,JSON.stringify(arr));}
  const rlts=parse(valeur);
  function addR(){save(rlts.concat([{type:"",etat:"",change:""}]));}
  function delR(n){save(rlts.filter((_,j)=>j!==n));}
  function updR(n,f,v){save(rlts.map((x,j)=>j===n?{...x,[f]:v}:x));}
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {rlts.map((r,n)=>{
        const isAutre=r.type&&!ROULEMENTS.slice(0,-1).includes(r.type);
        return(<div key={n} style={{border:"1px solid #E2E6EA",borderRadius:8,padding:"8px 10px",background:"#F8F9FA"}}>
          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
            <select value={isAutre?"Autre":(r.type||"")} onChange={e=>{if(e.target.value==="Autre")updR(n,"type","Autre:");else updR(n,"type",e.target.value);}} style={{...S.sel,flex:1}}>
              <option value="">Type roulement</option>
              {ROULEMENTS.map(rr=><option key={rr}>{rr}</option>)}
            </select>
            <button onClick={()=>delR(n)} style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:6,color:"#D73A49",padding:"4px 8px",cursor:"pointer",fontSize:12}}>X</button>
          </div>
          {(isAutre||r.type?.startsWith("Autre:"))&&<input type="text" placeholder="Référence précise..." value={r.type?.replace("Autre:","")||""} onChange={e=>updR(n,"type","Autre:"+e.target.value)} style={{...S.inp,marginBottom:6}}/>}
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <select value={r.etat||""} onChange={e=>updR(n,"etat",e.target.value)} style={{...S.sel,flex:1,minWidth:110}}>
              <option value="">État</option>
              <option value="RAS">RAS</option><option value="Usé">Usé</option><option value="HS">HS</option><option value="Cassé">Cassé</option>
            </select>
            <select value={r.change||""} onChange={e=>updR(n,"change",e.target.value)} style={{...S.sel,flex:1,minWidth:110}}>
              <option value="">Changé ?</option>
              <option value="Oui">Changé</option><option value="Non">Non changé</option>
            </select>
          </div>
        </div>);
      })}
      <button onClick={addR} style={{...S.p2,fontSize:12,padding:"6px 12px",color:"#22863A",borderColor:"#22863A"}}>+ Ajouter un roulement</button>
    </div>
  );
}

function appendTexte(actuel,nouveau){const a=(actuel||"").trim();return a?a+" "+nouveau:nouveau;}
function BoutonDictee({onTexte}){
  const [ecoute,setEcoute]=useState(false);
  const recRef=useRef(null);
  function toggle(e){
    e.preventDefault();
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert("Dictée vocale non supportée par ce navigateur.");return;}
    if(ecoute){recRef.current&&recRef.current.stop();return;}
    const rec=new SR();
    rec.lang="fr-FR";rec.interimResults=false;rec.maxAlternatives=1;
    rec.onresult=ev=>{onTexte(ev.results[0][0].transcript);};
    rec.onend=()=>setEcoute(false);
    rec.onerror=()=>setEcoute(false);
    recRef.current=rec;
    setEcoute(true);
    rec.start();
  }
  return <button type="button" onClick={toggle} title="Dictée vocale" style={{background:ecoute?"#D73A49":"#EEF4FF",color:ecoute?"#fff":"#1B4F8A",border:"none",borderRadius:6,padding:"8px 12px",cursor:"pointer",fontSize:15,flexShrink:0,alignSelf:"flex-start"}}>{ecoute?"⏺":"🎤"}</button>;
}
function ChampTexteDictee({champId,valeur,onChange,erreur}){
  return(<div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
    <textarea value={valeur||""} onChange={e=>onChange(champId,e.target.value)} style={{...(erreur?S.inpErr:S.inp),minHeight:60,resize:"vertical",fontFamily:"inherit",flex:1}} placeholder="—"/>
    <BoutonDictee onTexte={txt=>onChange(champId,appendTexte(valeur,txt))}/>
  </div>);
}

function BoutonPhotoSkf({categorie,ficheId,cheminBase,photos=[],onPhotoAdded}){
  var fr=React.useRef();
  var uplState=React.useState(false);
  var upl=uplState[0]; var setUpl=uplState[1];
  var photo=photos.find(function(p){return p.categorie_nom===categorie;});
  function upload(e){
    var file=e.target.files[0]; if(!file)return;
    setUpl(true);
    var ext=file.name.split(".").pop();
    var slug=categorie.toLowerCase().replace(/[^a-z0-9]/g,"_");
    var path=(cheminBase||"photos")+"/"+slug+"."+ext;
    db.uploadPhoto(path,file).then(function(){
      return db.post("fiche_photos",{fiche_id:ficheId,storage_path:path,nom_fichier:file.name,categorie_nom:categorie,etape:""});
    }).then(function(rec){
      if(rec&&rec[0])onPhotoAdded(Object.assign({},rec[0],{url:db.photoUrl(path)}));
      setUpl(false);
    }).catch(function(err){alert("Erreur: "+err.message);setUpl(false);});
  }
  return(<div style={{display:"flex",gap:8,alignItems:"center",marginTop:4}}>
    <input ref={fr} type="file" accept="image/*" capture="environment" onChange={upload} style={{display:"none"}}/>
    {photo
      ?<div style={{display:"flex",gap:8,alignItems:"center"}}>
          <img src={photo.url} alt={categorie} style={{width:60,height:45,objectFit:"cover",borderRadius:6,border:"1px solid #E2E6EA",cursor:"pointer"}} onClick={function(){window.open(photo.url,"_blank");}}/>
          <span style={{fontSize:11,color:"#22863A"}}>{"OK"}</span>
          <button onClick={function(){fr.current.click();}} style={{...S.p2,fontSize:11,padding:"3px 8px"}}>{upl?"...":"Remplacer"}</button>
        </div>
      :<button onClick={function(){fr.current.click();}} disabled={!ficheId||upl} style={{...S.p2,fontSize:12,padding:"6px 12px",opacity:ficheId?1:0.5}}>{upl?"...":"Photo: "+categorie}</button>
    }
  </div>);
}


function ChampGarnitureMobile({valeur,onChange}){
  const isAutre=valeur&&!GM_MOBILE_OPTIONS.slice(0,-1).includes(valeur);
  return(<div style={{display:"flex",flexDirection:"column",gap:6}}>
    <select value={isAutre?"Autre":(valeur||"")} onChange={e=>{if(e.target.value==="Autre")onChange("Autre:");else onChange(e.target.value);}} style={S.sel}>
      <option value="">— Sélectionner</option>
      {GM_MOBILE_OPTIONS.map(r=><option key={r}>{r}</option>)}
    </select>
    {(isAutre||valeur?.startsWith("Autre:"))&&<input type="text" placeholder="Référence précise..." value={valeur?.replace("Autre:","")||""} onChange={e=>onChange("Autre:"+e.target.value)} style={S.inp}/>}
  </div>);
}

function ChampGarnitureFixe({valeur,onChange}){
  const isAutre=valeur&&!GM_FIXE_OPTIONS.slice(0,-1).includes(valeur);
  return(<div style={{display:"flex",flexDirection:"column",gap:6}}>
    <select value={isAutre?"Autre":(valeur||"")} onChange={e=>{if(e.target.value==="Autre")onChange("Autre:");else onChange(e.target.value);}} style={S.sel}>
      <option value="">— Sélectionner</option>
      {GM_FIXE_OPTIONS.map(r=><option key={r}>{r}</option>)}
    </select>
    {(isAutre||valeur?.startsWith("Autre:"))&&<input type="text" placeholder="Référence précise..." value={valeur?.replace("Autre:","")||""} onChange={e=>onChange("Autre:"+e.target.value)} style={S.inp}/>}
  </div>);
}

function SectionPhotos({etape,ficheId,cheminBase,categories,photos,onPhotoAdded}){
  const [uploading,setUploading]=useState(false);const [cat,setCat]=useState("");const [apercu,setApercu]=useState(null);const [errMsg,setErrMsg]=useState("");const inputRef=useRef(null);
  const photosEtape=photos.filter(p=>p.etape===etape);
  async function handleFile(e){
    const file=e.target.files[0];if(!file||!cat)return;setUploading(true);setErrMsg("");
    try{const catObj=categories.find(c=>c.nom===cat)||{slug:slugCat(cat),nom:cat};const count=photos.filter(p=>p.categorie_slug===catObj.slug).length+1;const ext=file.name.match(/\.[^.]+$/)?.[0]||".jpg";const nomFichier=`${catObj.slug}_${count}${ext}`;const path=cheminBase+"/"+nomFichier;await db.uploadPhoto(path,file);const photoData={fiche_id:ficheId||null,etape,categorie_slug:catObj.slug,categorie_nom:catObj.nom,nom_fichier:nomFichier,storage_path:path};if(ficheId)await db.post("fiche_photos",photoData);onPhotoAdded({...photoData,url:db.photoUrl(path)});setCat("");}catch(err){setErrMsg("Erreur upload : "+err.message);}
    setUploading(false);if(inputRef.current)inputRef.current.value="";
  }
  return(<div style={{background:"#F8F9FA",borderRadius:8,padding:"10px 12px",marginTop:6,marginBottom:14}}>
    <p style={{fontSize:11,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:".05em",margin:"0 0 8px"}}>📷 Photos — {etape}</p>
    {photosEtape.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>{photosEtape.map((p,i)=><div key={i} onClick={()=>setApercu(p)} style={{cursor:"pointer",position:"relative"}}><img src={p.url} alt={p.categorie_nom} style={{width:60,height:60,objectFit:"cover",borderRadius:5,border:"1.5px solid #E2E6EA",display:"block"}} onError={e=>e.target.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23eee'/%3E%3C/svg%3E"}/><div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.6)",borderRadius:"0 0 4px 4px",padding:"2px 3px",fontSize:8,color:"#fff",textAlign:"center"}}>{p.categorie_nom}</div></div>)}</div>}
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}><select value={cat} onChange={e=>setCat(e.target.value)} style={{...S.sel,flex:1,minWidth:130,fontSize:12}}><option value="">— Catégorie</option>{categories.map(c=><option key={c.nom}>{c.nom}</option>)}</select><button onClick={()=>{if(!cat){setErrMsg("Choisissez une catégorie");return;}inputRef.current?.click();}} style={{...S.p2,fontSize:12,padding:"6px 12px",opacity:cat?1:0.5,whiteSpace:"nowrap"}}>{uploading?"⏳…":"📷 Photo"}</button><input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{display:"none"}}/></div>
    {errMsg&&<p style={{fontSize:11,color:"#D73A49",marginTop:4}}>{errMsg}</p>}
    {apercu&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:500,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}} onClick={()=>setApercu(null)}><img src={apercu.url} alt={apercu.categorie_nom} style={{maxWidth:"92vw",maxHeight:"82vh",objectFit:"contain",borderRadius:8}}/><p style={{color:"#fff",marginTop:10,fontSize:13}}>{apercu.categorie_nom} — {apercu.nom_fichier}</p><p style={{color:"rgba(255,255,255,0.5)",fontSize:11,marginTop:4}}>Appuyez pour fermer</p></div>}
  </div>);
}

function UnChamp({c,v,onChange,techs,clients,onAddClient,ficheId,cheminBase,photos=[],onPhotoAdded}){
  if(!champVisible(c,v))return null;
  const val=v[c.id]||"";const manqueOr=c.orRequiredWith&&!val&&!v[c.orRequiredWith];const manque=(c.required&&!val)||manqueOr;const err=enErreur(c,val);
  const lbl=<label style={{...S.lbl,color:manque?"#D73A49":"#6B7280"}}>{c.label}{(c.required||c.orRequiredWith)&&<span style={{color:"#D73A49"}}> *</span>}{c.unite&&<span style={{color:"#9CA3AF",fontWeight:400,textTransform:"none"}}> ({c.unite})</span>}{c.note&&<span style={{color:"#9CA3AF",fontWeight:400,textTransform:"none",fontSize:10}}> — {c.note}</span>}</label>;
  let ctrl;
  if(c.type==="client")ctrl=<ChampClient valeur={val} onChange={nv=>onChange(c.id,nv)} clients={clients} onAddClient={onAddClient}/>;
  else if(c.type==="technicien")ctrl=<ChampTechnicien valeur={val} onChange={nv=>onChange(c.id,nv)} techs={techs}/>;
  else if(c.type==="roulement")ctrl=<ChampRoulement valeur={val} onChange={nv=>onChange(c.id,nv)}/>;
  else if(c.type==="ohm")ctrl=<ChampOhm champId={c.id} valeur={val} onChange={onChange}/>;
  else if(c.type==="joints")ctrl=<ChampJoints champId={c.id} valeur={val} onChange={onChange}/>;
  else if(c.type==="roulements_liste")ctrl=<ChampRoulementsListe champId={c.id} valeur={val} onChange={onChange}/>;
  else if(c.type==="photo_skf")ctrl=<BoutonPhotoSkf categorie={c.categorie} ficheId={ficheId} cheminBase={cheminBase} photos={photos} onPhotoAdded={onPhotoAdded}/>;
  else if(c.type==="garniture_mobile")ctrl=<ChampGarnitureMobile valeur={val} onChange={nv=>onChange(c.id,nv)}/>;
  else if(c.type==="garniture_fixe")ctrl=<ChampGarnitureFixe valeur={val} onChange={nv=>onChange(c.id,nv)}/>;
  else if(c.type==="calcul"){
    const [a,b]=c.calcul.split("-");
    const va=parseFloat(v[a]||0);const vb=parseFloat(v[b]||0);
    const res=isNaN(va)||isNaN(vb)?"—":(va-vb).toFixed(2)+" "+(c.unite||"");
    ctrl=<div style={{padding:"7px 9px",borderRadius:6,border:"1.5px solid #E2E6EA",background:"#F8F9FA",fontSize:13,fontWeight:600,color:"#1B4F8A"}}>{res}</div>;
  }
  else if(c.type==="select"){const isAutre=val&&!c.options.includes(val)&&c.autreTexte;ctrl=<div style={{display:"flex",flexDirection:"column",gap:5}}><select value={isAutre?"Autre":(val||"")} onChange={e=>{if(e.target.value==="Autre")onChange(c.id,"Autre:");else onChange(c.id,e.target.value);}} style={S.sel}><option value="">— Sélectionner</option>{c.options.map(o=><option key={o}>{o}</option>)}</select>{(isAutre||val?.startsWith("Autre:"))&&c.autreTexte&&<input type="text" placeholder="Préciser..." value={val?.replace("Autre:","")||""} onChange={e=>onChange(c.id,"Autre:"+e.target.value)} style={S.inp}/>}</div>;}
  else if(c.type==="mesure")ctrl=<div><div style={{display:"flex",alignItems:"center",gap:6}}><input type="number" value={val||""} onChange={e=>onChange(c.id,e.target.value)} style={err?{...S.inpErr,flex:1}:{...S.inp,flex:1}} placeholder="—"/>{c.unite&&<span style={{fontSize:12,color:"#6B7280",whiteSpace:"nowrap"}}>{c.unite}</span>}</div>{err&&<div style={S.alert}>⚠ Sous le seuil ({c.seuilMin} {c.unite})</div>}</div>;
  else if(c.type==="oui_non")ctrl=<div style={{display:"flex",gap:16}}>{["Oui","Non"].map(opt=><label key={opt} style={{display:"flex",alignItems:"center",gap:5,fontSize:13,cursor:"pointer"}}><input type="radio" checked={val===opt} onChange={()=>onChange(c.id,opt)}/> {opt}</label>)}</div>;
  else if(c.type==="date")ctrl=<input type="date" value={val} onChange={e=>onChange(c.id,e.target.value)} style={S.inp}/>;
  else if(c.type==="number")ctrl=<div style={{display:"flex",alignItems:"center",gap:6}}><input type="number" value={val} onChange={e=>onChange(c.id,e.target.value)} style={{...S.inp,flex:1}} placeholder="—"/>{c.unite&&<span style={{fontSize:12,color:"#6B7280",whiteSpace:"nowrap"}}>{c.unite}</span>}</div>;
  else if(c.dictee)ctrl=<ChampTexteDictee champId={c.id} valeur={val} onChange={onChange} erreur={manque}/>;
  else ctrl=<input type="text" value={val} onChange={e=>onChange(c.id,e.target.value)} style={manque?S.inpErr:S.inp} placeholder="—"/>;
  return <div style={{marginBottom:12}}>{lbl}{ctrl}{manque&&<div style={{fontSize:10,color:"#D73A49",marginTop:2}}>{manqueOr?"L'un des deux — "+c.label+" ou "+(c.orRequiredLabel||"l'autre champ")+" — est obligatoire":"Champ obligatoire"}</div>}</div>;
}

function RenduChamps({nom,v,onChange,techs,clients,onAddClient,ficheId,cheminBase,categories,photos=[],onPhotoAdded,champsSource}){
  const width=useWidth();const champs=(champsSource||CHAMPS)[nom]||[];const rendus=[];const vus=new Set();
  for(let i=0;i<champs.length;i++){const c=champs[i];if(vus.has(c.id))continue;if(!champVisible(c,v)){vus.add(c.id);continue;}if(c.groupe){const grp=champs.filter(cc=>cc.groupe===c.groupe&&champVisible(cc,v));grp.forEach(cc=>vus.add(cc.id));const nCols=grilleCols(grp.length===3?3:2,width);rendus.push(<div key={c.groupe} style={{display:"grid",gridTemplateColumns:"repeat("+nCols+",1fr)",gap:8,marginBottom:4}}>{grp.map(cc=><UnChamp key={cc.id} c={cc} v={v} onChange={onChange} techs={techs} clients={clients} onAddClient={onAddClient} ficheId={ficheId} cheminBase={cheminBase} photos={photos} onPhotoAdded={onPhotoAdded}/>)}</div>);}else{vus.add(c.id);rendus.push(<UnChamp key={c.id} c={c} v={v} onChange={onChange} techs={techs} clients={clients} onAddClient={onAddClient} ficheId={ficheId} cheminBase={cheminBase} photos={photos} onPhotoAdded={onPhotoAdded}/>);}}
  rendus.push(<SectionPhotos key="photos" etape={nom} ficheId={ficheId} cheminBase={cheminBase} categories={categories} photos={photos.filter(p=>p.etape===nom)} onPhotoAdded={p=>onPhotoAdded({...p,etape:nom})}/>);
  return <>{rendus}</>;
}

function SectionEtape({nom,idx,total,actif,validees,v,nr,onChange,onNR,onValider,onSauvegarder,onAutoSaveChamp,sessionTech,techs,clients,onAddClient,saving,ficheId,cheminBase,categories,photos,onPhotoAdded,champsSource}){
  const [ouvert,setOuvert]=useState(false);const estAct=idx===actif,estVal=validees.includes(idx),estLock=idx>actif;const cs2=champsSource||CHAMPS;const ok=etapeOk(nom,v,nr,cs2);const techEtape=(cs2[nom]||[]).filter(c=>c.type==="technicien").map(c=>v[c.id]||"—")[0]||"—";const nbPhotos=photos.filter(p=>p.etape===nom).length;
  function resume(){return(cs2[nom]||[]).filter(c=>c.type!=="technicien"&&champVisible(c,v)&&v[c.id]).slice(0,3).map(c=>`${c.label}: ${v[c.id]}${c.unite?" "+c.unite:""}`).join(" · ");}
  if(estLock)return<div style={S.cLock}><div style={{display:"flex",alignItems:"center",gap:10}}><span>🔒</span><span style={{fontSize:14,color:"#9CA3AF"}}>{idx+1}. {nom}</span></div></div>;
  if(estVal&&!estAct)return(<div style={S.cDone}><div onClick={()=>setOuvert(!ouvert)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 16px",cursor:"pointer",background:ouvert?"#F0FFF4":"#fff"}}><div style={{display:"flex",alignItems:"center",gap:10}}><span>✅</span><div><span style={{fontSize:14,fontWeight:600}}>{idx+1}. {nom}</span><span style={{fontSize:12,color:"#9CA3AF",marginLeft:8}}>— {techEtape}{nbPhotos>0?" · 📷 "+nbPhotos:""}}</span></div></div><span style={{fontSize:12,color:"#6B7280"}}>{ouvert?"▲":"▼"}</span></div>{ouvert?(<div style={{padding:"14px 16px",borderTop:"1px solid #E2E6EA"}}><div style={S.info}>✏️ Modification tracée dans l'historique.</div><RenduChamps nom={nom} v={v} onChange={onChange} techs={techs} clients={clients} onAddClient={onAddClient} ficheId={ficheId} cheminBase={cheminBase} categories={categories} photos={photos} onPhotoAdded={onPhotoAdded} champsSource={cs2}/></div>):<div style={{padding:"3px 16px 10px",fontSize:12,color:"#6B7280"}}>{resume()}</div>}</div>);
  return(<div style={S.cAct}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}><div><span style={{fontSize:11,fontWeight:700,color:"#1B4F8A",textTransform:"uppercase",letterSpacing:".07em"}}>En cours</span><p style={{fontSize:16,fontWeight:700,margin:"2px 0 0"}}>{idx+1}. {nom}</p></div><span style={{fontSize:12,color:"#9CA3AF"}}>{idx+1}/{total||ETAPES.length}</span></div><div style={S.tech}><span>👤</span><span style={{fontSize:13,color:"#1B4F8A"}}>Session : <strong>{sessionTech}</strong></span></div>{idx!==0&&<div style={S.nr} onClick={onNR}><input type="checkbox" checked={nr} onChange={onNR} onClick={e=>e.stopPropagation()}/><div><span style={{fontSize:13,fontWeight:600}}>Étape non réalisable</span><p style={{fontSize:11,color:"#9CA3AF",margin:"1px 0 0"}}>Si coché, les champs ne sont plus obligatoires</p></div></div>}<div style={{opacity:nr?0.4:1,pointerEvents:nr?"none":"auto"}}><RenduChamps nom={nom} v={v} onChange={onChange} techs={techs} clients={clients} onAddClient={onAddClient} ficheId={ficheId} cheminBase={cheminBase} categories={categories} photos={photos} onPhotoAdded={onPhotoAdded} champsSource={cs2}/></div>{!ok&&!nr&&<div style={{...S.alert,marginBottom:10}}>⚠ Des champs obligatoires (*) sont manquants.</div>}<button onClick={onSauvegarder} disabled={saving} style={{...S.p2,marginTop:8,width:"100%",justifyContent:"center",opacity:saving?0.5:1}}>{saving?"💾 ...":"💾 Enregistrer"}</button>{(ok||nr)&&<button style={{...S.p1,width:"100%",justifyContent:"center",opacity:saving?0.5:1,marginTop:8}} disabled={saving} onClick={onValider}>{saving?"...":"✓ Valider et continuer →"}</button>}{!ok&&!nr&&<div style={{...S.alert,marginBottom:0,marginTop:8}}>⚠ Remplissez les champs obligatoires (*) pour continuer</div>}</div>);
}

function ModalIdent({techs,onConfirm}){
  const [t,setT]=useState("");
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}><div style={{background:"#fff",borderRadius:14,padding:"32px 28px",width:340,boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}><div style={{textAlign:"center",marginBottom:20}}><div style={{fontSize:36,marginBottom:8}}>🏷️</div><p style={{fontSize:17,fontWeight:700,margin:0}}>Qui ouvre cette fiche ?</p><p style={{fontSize:13,color:"#6B7280",margin:"4px 0 0"}}>Votre identité sera tracée pour cette session.</p></div><select value={t} onChange={e=>setT(e.target.value)} style={{...S.sel,marginBottom:16}}><option value="">— Sélectionner</option>{techs.map(x=><option key={x}>{x}</option>)}</select><button style={{...S.p1,width:"100%",justifyContent:"center",opacity:t?1:0.5}} disabled={!t} onClick={()=>onConfirm(t)}>Ouvrir la fiche</button></div></div>);
}

function SelecteurStatut({statutId,onChange}){
  const st=statutInfo(statutId||"A_demonter");
  return(<select value={statutId||"A_demonter"} onChange={e=>onChange(e.target.value)} style={{padding:"4px 10px",borderRadius:20,border:"1.5px solid "+st.color,fontSize:12,fontWeight:600,color:st.color,background:st.bg,cursor:"pointer"}}>{STATUTS_CHANTIER.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>);
}

// ─── SECTION MATÉRIEL À COMMANDER (fin de fiche) ────────────────────────
function SectionMaterielCommander({v,ficheId,de,client,piecesInit,onSave,typeMateriel}){
  const [pieces,setPieces]=useState([]);
  const [newDesig,setNewDesig]=useState("");const [newRef,setNewRef]=useState("");const [saving,setSaving]=useState(false);const [saved,setSaved]=useState(false);

  useEffect(()=>{
    const auto=detecterPieces(v,typeMateriel).map((p,i)=>({id:"auto_"+i,...p,checked:true,source:"auto"}));
    const manuel=piecesInit.filter(p=>p.source==="manuel").map((p,i)=>({id:"man_"+i,designation:p.designation,reference:p.reference||"",checked:true,source:"manuel"}));
    setPieces([...auto,...manuel]);
  },[v]);

  function toggle(id){setPieces(prev=>prev.map(p=>p.id===id?{...p,checked:!p.checked}:p));}
  function supprimer(id){setPieces(prev=>prev.filter(p=>p.id!==id));}
  function ajouter(){
    if(!newDesig.trim())return;
    setPieces(prev=>[...prev,{id:"man_"+Date.now(),designation:newDesig.trim(),reference:newRef.trim(),checked:true,source:"manuel"}]);
    setNewDesig("");setNewRef("");
  }

  async function sauvegarder(){
    if(!ficheId)return;setSaving(true);
    try{
      await db.del("suivi_pieces","?fiche_id=eq."+ficheId);
      const cochees=pieces.filter(p=>p.checked);
      if(cochees.length>0)await db.post("suivi_pieces",cochees.map(p=>({fiche_id:ficheId,de,client,designation:p.designation,reference:p.reference||"",statut:"A_recommander",source:p.source})));
      setSaved(true);setTimeout(()=>setSaved(false),3000);
      if(onSave)onSave(cochees);
    }catch(e){}
    setSaving(false);
  }

  const nCochees=pieces.filter(p=>p.checked).length;

  return(<div style={{...S.card,border:"1px solid #E8720C"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
      <p style={{fontSize:14,fontWeight:700,margin:0}}>🔧 Matériel à commander</p>
      {nCochees>0&&<span style={{background:"#FFF8E1",color:"#E8720C",fontSize:12,padding:"3px 10px",borderRadius:20,fontWeight:600}}>{nCochees} pièce{nCochees>1?"s":""} sélectionnée{nCochees>1?"s":""}</span>}
    </div>

    {pieces.length===0&&<p style={{fontSize:13,color:"#9CA3AF",marginBottom:12}}>Aucune pièce détectée automatiquement. Ajoutez-en manuellement si besoin.</p>}

    {pieces.filter(p=>p.source==="auto").length>0&&<p style={{fontSize:11,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:".05em",margin:"0 0 6px"}}>Détecté automatiquement</p>}
    {pieces.filter(p=>p.source==="auto").map(p=>(
      <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:7,border:"1px solid "+(p.checked?"#22863A":"#E2E6EA"),background:p.checked?"#F0FFF4":"#F8F9FA",marginBottom:6}}>
        <input type="checkbox" checked={p.checked} onChange={()=>toggle(p.id)} style={{width:16,height:16,cursor:"pointer",accentColor:"#22863A"}}/>
        <span style={{flex:1,fontSize:13,fontWeight:500}}>{p.designation}</span>
        {p.reference&&<span style={{fontSize:11,color:"#6B7280",background:"#fff",border:"1px solid #E2E6EA",borderRadius:4,padding:"2px 7px"}}>{p.reference}</span>}
        <span style={{fontSize:10,background:"#F0FFF4",color:"#22863A",borderRadius:20,padding:"2px 7px"}}>auto</span>
      </div>
    ))}

    {pieces.filter(p=>p.source==="manuel").length>0&&<p style={{fontSize:11,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:".05em",margin:"10px 0 6px"}}>Ajouté manuellement</p>}
    {pieces.filter(p=>p.source==="manuel").map(p=>(
      <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:7,border:"1px solid "+(p.checked?"#1B4F8A":"#E2E6EA"),background:p.checked?"#EEF4FF":"#F8F9FA",marginBottom:6}}>
        <input type="checkbox" checked={p.checked} onChange={()=>toggle(p.id)} style={{width:16,height:16,cursor:"pointer",accentColor:"#1B4F8A"}}/>
        <span style={{flex:1,fontSize:13,fontWeight:500}}>{p.designation}</span>
        {p.reference&&<span style={{fontSize:11,color:"#6B7280",background:"#fff",border:"1px solid #E2E6EA",borderRadius:4,padding:"2px 7px"}}>{p.reference}</span>}
        <span style={{fontSize:10,background:"#EEF4FF",color:"#1B4F8A",borderRadius:20,padding:"2px 7px"}}>manuel</span>
        <button onClick={()=>supprimer(p.id)} style={{background:"none",border:"none",color:"#9CA3AF",cursor:"pointer",fontSize:16,padding:"0 2px"}} title="Supprimer">×</button>
      </div>
    ))}

    <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
      <input type="text" value={newDesig} onChange={e=>setNewDesig(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ajouter()} placeholder="Désignation de la pièce..." style={{...S.inp,flex:1,minWidth:160}}/>
      <input type="text" value={newRef} onChange={e=>setNewRef(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ajouter()} placeholder="Référence (optionnel)" style={{...S.inp,width:160}}/>
      <button onClick={ajouter} style={{...S.p2,whiteSpace:"nowrap"}}>+ Ajouter</button>
    </div>

    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:14,paddingTop:12,borderTop:"1px solid #E2E6EA",flexWrap:"wrap",gap:8}}>
      <span style={{fontSize:12,color:"#6B7280"}}>{nCochees} pièce{nCochees>1?"s":""} seront envoyées au suivi</span>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        {saved&&<span style={{fontSize:12,color:"#22863A"}}>✅ Enregistré</span>}
        {!ficheId&&<span style={{fontSize:11,color:"#9CA3AF"}}>Validez une étape d'abord</span>}
        <button onClick={sauvegarder} disabled={saving||!ficheId} style={{...S.p1,opacity:ficheId?1:0.5}}>{saving?"Enregistrement…":"💾 Enregistrer"}</button>
      </div>
    </div>
  </div>);
}

// ─── APERÇU FICHE ───────────────────────────────────────────────────────
function ApercuFiche({v,photos,statutChantier,commentaires,pieces,nrMap,champsData,etapesData,onClose}){
  const html=genHtml(v,photos||[],statutChantier,commentaires||"",pieces||[],nrMap||{},champsData,etapesData);
  var w=window.open("","_blank","width=1000,height=800,scrollbars=yes");
  if(w){w.document.write(html);w.document.close();}
  onClose();
  return null;
}


// ─── STOCKAGE SUPABASE ──────────────────────────────────────────────────
async function getStorageUsage(){
  try{
    const SUPA_URL="https://pupbzngvudprcweukuoi.supabase.co";
    const SUPA_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1cGJ6bmd2dWRwcmN3ZXVrdW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxODY3NDAsImV4cCI6MjA5Nzc2Mjc0MH0.jn025v42M3qNpAKfvy49cdCySBdTqwRz99b1EfaKYoo";
    const r=await fetch(`${SUPA_URL}/rest/v1/fiche_photos?select=storage_path`,{headers:{"apikey":SUPA_KEY,"Authorization":`Bearer ${SUPA_KEY}`}});
    const photos=await r.json();
    if(!Array.isArray(photos))return null;
    // Estimation: moyenne 1.5 Mo par photo
    const estMo=photos.length*1.5;
    const pct=Math.round((estMo/1024)*100);
    return {nbPhotos:photos.length,estMo:Math.round(estMo),pct:Math.min(pct,100)};
  }catch(e){return null;}
}

function BadgeStockage({onClick}){
  const [usage,setUsage]=React.useState(null);
  useEffect(()=>{
    getStorageUsage().then(u=>setUsage(u));
    const t=setInterval(()=>getStorageUsage().then(u=>setUsage(u)),60000);
    return()=>clearInterval(t);
  },[]);
  const pct=usage?.pct||0;
  const estMo=usage?.estMo||0;
  const barColor=pct>=90?"#D73A49":pct>=70?"#E8720C":"#22863A";
  return(<button onClick={onClick} style={{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:20,padding:"4px 12px",cursor:"pointer",color:"#fff",fontSize:11}}>
    <span style={{fontWeight:600,whiteSpace:"nowrap"}}>📦 {estMo} Mo</span>
    <div style={{width:60,height:6,background:"rgba(255,255,255,0.2)",borderRadius:6,overflow:"hidden"}}>
      <div style={{height:6,borderRadius:6,background:barColor,width:Math.min(pct,100)+"%",transition:"width .5s"}}/>
    </div>
    <span style={{fontSize:10,opacity:0.8,whiteSpace:"nowrap"}}>{pct}%</span>
    <span style={{fontSize:10,opacity:0.7}}>Gérer</span>
  </button>);
}

function PageStockage({fiches,onRetour}){
  const [photos,setPhotos]=React.useState([]);
  const [loading,setLoading]=React.useState(true);
  const [selection,setSelection]=React.useState({});
  const [exportEnCours,setExportEnCours]=React.useState(false);
  const [confirmSuppr,setConfirmSuppr]=React.useState(false);
  const [suppEnCours,setSuppEnCours]=React.useState(false);
  const [msg,setMsg]=React.useState(null);

  const CINQ_MOIS=5*30*24*60*60*1000;

  useEffect(()=>{
    db.get("fiche_photos","?select=*&order=created_at").then(p=>{
      if(Array.isArray(p))setPhotos(p.map(pp=>({...pp,url:db.photoUrl(pp.storage_path)})));
      setLoading(false);
    });
  },[]);

  // Grouper les photos par fiche_id
  const parFiche={};
  photos.forEach(p=>{
    if(!parFiche[p.fiche_id])parFiche[p.fiche_id]={fiche_id:p.fiche_id,photos:[]};
    parFiche[p.fiche_id].photos.push(p);
  });

  // Fiches candidates = Terminé OU Abandonné OU > 5 mois
  const maintenant=Date.now();
  const candidates=fiches.filter(f=>{
    const nbPhotos=parFiche[f.id]?.photos?.length||0;
    if(nbPhotos===0)return false;
    const ancienne=(maintenant-new Date(f.updated_at||f.created_at).getTime())>CINQ_MOIS;
    return f.statut_chantier==="Termine"||f.statut_chantier==="Abandonne"||ancienne;
  });

  function toggleSel(id){setSelection(prev=>({...prev,[id]:!prev[id]}));}
  function toutSelectionner(){const s={};candidates.forEach(f=>{s[f.id]=true;});setSelection(s);}
  function toutDeselectionner(){setSelection({});}
  const selectionIds=Object.keys(selection).filter(id=>selection[id]);
  const photosSelectionnees=selectionIds.flatMap(id=>parFiche[id]?.photos||[]);
  const estMoTotal=Math.round(photos.length*1.5);
  const estMoSel=Math.round(photosSelectionnees.length*1.5);

  async function exporter(){
    if(photosSelectionnees.length===0)return;
    setExportEnCours(true);
    await telechargerZip(photosSelectionnees,null,"photos_archivage");
    setExportEnCours(false);
  }

  async function supprimerPhotos(){
    setSuppEnCours(true);
    try{
      for(const id of selectionIds){
        await db.del("fiche_photos","?fiche_id=eq."+id);
      }
      setPhotos(prev=>prev.filter(p=>!selectionIds.includes(p.fiche_id)));
      setSelection({});
      setConfirmSuppr(false);
      setMsg("✅ Photos supprimées — les fiches et toutes les données sont conservées intactes.");
      setTimeout(()=>setMsg(null),5000);
    }catch(e){setMsg("Erreur : "+e.message);}
    setSuppEnCours(false);
  }

  function raisonCandidate(f){
    const ancienne=(maintenant-new Date(f.updated_at||f.created_at).getTime())>CINQ_MOIS;
    if(f.statut_chantier==="Termine")return{label:"Terminé",color:"#6B7280",bg:"#F5F6F8"};
    if(f.statut_chantier==="Abandonne")return{label:"Abandonné",color:"#9B59B6",bg:"#F5EEF8"};
    if(ancienne)return{label:"+5 mois",color:"#E8720C",bg:"#FFF8E1"};
    return{label:"",color:"",bg:""};
  }

  return(<div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
      <div>
        <h2 style={{fontSize:20,fontWeight:700,margin:0}}>🗂 Gestion du stockage</h2>
        <p style={{fontSize:13,color:"#6B7280",margin:"4px 0 0"}}>{photos.length} photos · ~{estMoTotal} Mo utilisés sur 1 024 Mo</p>
      </div>
      <button style={S.p2} onClick={onRetour}>← Retour</button>
    </div>

    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"12px 16px",marginBottom:16}}>
      <div style={{height:8,background:"#F3F4F6",borderRadius:8,overflow:"hidden",marginBottom:8}}>
        <div style={{height:8,borderRadius:8,width:Math.min((estMoTotal/1024)*100,100)+"%",background:estMoTotal/1024>=0.9?"#D73A49":estMoTotal/1024>=0.8?"#E8720C":"#22863A",transition:"width .4s"}}/>
      </div>
      <p style={{fontSize:12,color:"#6B7280",margin:0}}>~{estMoTotal} Mo / 1 024 Mo ({Math.round((estMoTotal/1024)*100)}%) — estimation basée sur {photos.length} photos</p>
    </div>

    {msg&&<div style={{background:"#F0FFF4",border:"1px solid #22863A",borderRadius:8,padding:"10px 16px",marginBottom:16,fontSize:13,color:"#22863A"}}>{msg}</div>}

    <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
      <span style={{fontSize:13,color:"#6B7280"}}>{candidates.length} dossier{candidates.length>1?"s":""} candidat{candidates.length>1?"s":""} · {selectionIds.length} sélectionné{selectionIds.length>1?"s":""} (~{estMoSel} Mo)</span>
      <button onClick={toutSelectionner} style={{...S.p2,fontSize:12,padding:"4px 12px"}}>Tout sélectionner</button>
      <button onClick={toutDeselectionner} style={{...S.p2,fontSize:12,padding:"4px 12px"}}>Tout déselectionner</button>
    </div>

    {loading&&<div style={{textAlign:"center",padding:32,color:"#9CA3AF"}}>Chargement…</div>}
    {!loading&&candidates.length===0&&<div style={{textAlign:"center",padding:32,color:"#9CA3AF",background:"#fff",borderRadius:10,border:"1px solid #E2E6EA"}}>
      <p style={{fontSize:16,margin:"0 0 8px"}}>✅ Aucun dossier à nettoyer</p>
      <p style={{fontSize:13,color:"#9CA3AF",margin:0}}>Tous vos dossiers actifs ont moins de 5 mois</p>
    </div>}

    {candidates.map(f=>{
      const nb=parFiche[f.id]?.photos?.length||0;
      const raison=raisonCandidate(f);
      const sel=!!selection[f.id];
      return(<div key={f.id} style={{background:"#fff",borderRadius:10,border:"1.5px solid "+(sel?"#1B4F8A":"#E2E6EA"),marginBottom:8,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",cursor:"pointer"}} onClick={()=>toggleSel(f.id)}>
        <input type="checkbox" checked={sel} onChange={()=>toggleSel(f.id)} onClick={e=>e.stopPropagation()} style={{width:18,height:18,cursor:"pointer",accentColor:"#1B4F8A"}}/>
        <div style={{flex:1,minWidth:120}}>
          <span style={{fontSize:13,fontWeight:700,color:"#1B4F8A"}}>{f.de}</span>
          <span style={{fontSize:13,marginLeft:8}}>{f.client||"—"}</span>
          <span style={{fontSize:11,marginLeft:8,color:"#9CA3AF"}}>{f.materiel||""}</span>
        </div>
        <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:raison.bg,color:raison.color}}>{raison.label}</span>
        <span style={{fontSize:12,color:"#6B7280"}}>📷 {nb} photo{nb>1?"s":""} (~{Math.round(nb*1.5)} Mo)</span>
      </div>);
    })}

    {selectionIds.length>0&&<div style={{position:"sticky",bottom:0,background:"#fff",borderTop:"1.5px solid #E2E6EA",padding:"14px 0",marginTop:16,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",justifyContent:"flex-end"}}>
      {!confirmSuppr?(<>
        <button onClick={exporter} disabled={exportEnCours} style={{...S.p1,background:"#22863A",opacity:exportEnCours?0.6:1}}>
          {exportEnCours?"⏳ Export en cours…":"📥 Exporter ZIP ("+selectionIds.length+" dossier"+(selectionIds.length>1?"s":"") +")"}
        </button>
        <button onClick={()=>setConfirmSuppr(true)} style={S.pDanger}>📷 Supprimer les photos ({selectionIds.length})</button>
      </>):(<div style={{background:"#FFF5F5",border:"1.5px solid #D73A49",borderRadius:10,padding:"14px 18px",width:"100%"}}>
        <p style={{fontSize:14,fontWeight:700,color:"#D73A49",margin:"0 0 8px"}}>⚠️ Confirmation requise</p>
        <p style={{fontSize:13,margin:"0 0 14px"}}>Avez-vous bien sauvegardé ces photos sur votre NAS ou un autre support avant de supprimer ?</p>
        <p style={{fontSize:12,color:"#6B7280",margin:"0 0 14px"}}>Les fiches, mesures et données seront conservées. Seules les photos seront supprimées de Supabase.</p>
        <div style={{display:"flex",gap:10}}>
          <button onClick={supprimerPhotos} disabled={suppEnCours} style={{...S.pDanger,opacity:suppEnCours?0.6:1}}>{suppEnCours?"Suppression…":"✅ Oui, j'ai sauvegardé — supprimer les photos"}</button>
          <button onClick={()=>setConfirmSuppr(false)} style={S.p2}>❌ Non, annuler</button>
        </div>
      </div>)}
    </div>}
  </div>);
}


// ─── PAGE STATISTIQUES ──────────────────────────────────────────────────
function PageStats({fiches,pieces}){
  const [periode,setPeriode]=useState("total");

  function filtrerParPeriode(liste){
    if(periode==="total")return liste;
    const now=new Date();
    const mois=periode==="6mois"?6:12;
    const limite=new Date(now.getFullYear(),now.getMonth()-mois,now.getDate());
    return liste.filter(f=>new Date(f.created_at||f.updated_at)>=limite);
  }

  const fichesFilt=filtrerParPeriode(fiches);
  const piecesFilt=filtrerParPeriode(pieces);

  // Stats statuts
  const parStatut={};
  STATUTS_CHANTIER.forEach(s=>{parStatut[s.id]=fichesFilt.filter(f=>(f.statut_chantier||"A_demonter")===s.id).length;});
  const total=fichesFilt.length;

  // Taux conversion : Devis -> (En_commande + A_remonter + Termine)
  const totalDevis=fichesFilt.filter(f=>["Devis","En_commande","A_remonter","Termine"].includes(f.statut_chantier||"A_demonter")).length;
  const devisAcceptes=fichesFilt.filter(f=>["En_commande","A_remonter","Termine"].includes(f.statut_chantier)).length;
  const tauxConversion=totalDevis>0?Math.round((devisAcceptes/totalDevis)*100):0;
  const tauxAbandon=total>0?Math.round(((parStatut["Abandonne"]||0)/total)*100):0;
  const tauxTermine=total>0?Math.round(((parStatut["Termine"]||0)/total)*100):0;

  // Stats par technicien
  const parTech={};
  fichesFilt.forEach(f=>{const t=f.tech_entree||"—";if(!parTech[t])parTech[t]=0;parTech[t]++;});
  const techList=Object.entries(parTech).sort((a,b)=>b[1]-a[1]).slice(0,8);

  // Top clients
  const parClient={};
  fichesFilt.forEach(f=>{const c=f.client||"—";if(!parClient[c])parClient[c]=0;parClient[c]++;});
  const clientList=Object.entries(parClient).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Stats matériel
  const nAReco=piecesFilt.filter(p=>p.statut==="A_recommander"||!p.statut).length;
  const nCommande=piecesFilt.filter(p=>p.statut==="Commande").length;
  const parPiece={};
  piecesFilt.forEach(p=>{const d=p.designation||"—";if(!parPiece[d])parPiece[d]=0;parPiece[d]++;});
  const pieceList=Object.entries(parPiece).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Stats par mois (12 derniers mois)
  const parMois={};
  const now2=new Date();
  for(let i=11;i>=0;i--){
    const d=new Date(now2.getFullYear(),now2.getMonth()-i,1);
    const k=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    parMois[k]=0;
  }
  fiches.forEach(f=>{
    if(f.created_at){
      const d=new Date(f.created_at);
      const k=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
      if(parMois[k]!==undefined)parMois[k]++;
    }
  });
  const moisData=Object.entries(parMois).slice(-6);
  const maxMois=Math.max(...moisData.map(m=>m[1]),1);

  const card=(titre,valeur,detail,color="#1B4F8A")=>(
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"14px 16px"}}>
      <div style={{fontSize:11,color:"#6B7280",marginBottom:4,fontWeight:500}}>{titre}</div>
      <div style={{fontSize:28,fontWeight:700,color,lineHeight:1}}>{valeur}</div>
      {detail&&<div style={{fontSize:11,color:"#9CA3AF",marginTop:4}}>{detail}</div>}
    </div>
  );

  return(<div style={{maxWidth:1000,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
      <h2 style={{fontSize:20,fontWeight:700,margin:0}}>📊 Statistiques atelier</h2>
      <div style={{display:"flex",gap:6}}>
        {[["6mois","6 derniers mois"],["annee","Dernière année"],["total","Total"]].map(([v,l])=>(
          <button key={v} onClick={()=>setPeriode(v)} style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid "+(periode===v?"#1B4F8A":"#E2E6EA"),background:periode===v?"#1B4F8A":"#fff",color:periode===v?"#fff":"#6B7280",fontSize:12,fontWeight:600,cursor:"pointer"}}>{l}</button>
        ))}
      </div>
    </div>

    {/* Vue globale */}
    <div style={{fontSize:13,fontWeight:700,color:"#1B4F8A",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #EEF4FF"}}>Vue globale</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
      {card("Total dossiers",total,"",  "#1B4F8A")}
      {card("Taux conversion devis",tauxConversion+"%","Devis → Accepté","#22863A")}
      {card("Taux abandon",tauxAbandon+"%","Sur total dossiers","#D73A49")}
      {card("Taux terminé",tauxTermine+"%","Sur total dossiers","#6B7280")}
    </div>

    {/* Répartition par statut */}
    <div style={{fontSize:13,fontWeight:700,color:"#1B4F8A",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #EEF4FF"}}>Répartition par statut</div>
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"14px 16px",marginBottom:20}}>
      {STATUTS_CHANTIER.map(s=>{
        const n=parStatut[s.id]||0;
        const pct=total>0?Math.round((n/total)*100):0;
        return(<div key={s.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <span style={{fontSize:12,fontWeight:600,color:s.color,width:120,flexShrink:0}}>{s.label}</span>
          <div style={{flex:1,background:"#F5F6F8",borderRadius:20,height:8,overflow:"hidden"}}>
            <div style={{height:8,borderRadius:20,background:s.color,width:pct+"%",transition:"width .4s"}}/>
          </div>
          <span style={{fontSize:12,fontWeight:700,color:"#1A1A2E",width:30,textAlign:"right"}}>{n}</span>
          <span style={{fontSize:11,color:"#9CA3AF",width:32}}>{pct}%</span>
        </div>);
      })}
    </div>

    {/* Activité par mois */}
    <div style={{fontSize:13,fontWeight:700,color:"#1B4F8A",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #EEF4FF"}}>Activité — 6 derniers mois</div>
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"14px 16px",marginBottom:20}}>
      <div style={{display:"flex",alignItems:"flex-end",gap:8,height:80}}>
        {moisData.map(([k,n])=>{
          const h=maxMois>0?Math.round((n/maxMois)*64):0;
          const [y,m]=k.split("-");
          const nom=["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"][parseInt(m)-1];
          return(<div key={k} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <span style={{fontSize:10,fontWeight:700,color:"#1B4F8A"}}>{n||""}</span>
            <div style={{width:"100%",background:"#EEF4FF",borderRadius:"4px 4px 0 0",height:h+4,minHeight:4,transition:"height .4s"}}/>
            <span style={{fontSize:9,color:"#9CA3AF"}}>{nom}</span>
          </div>);
        })}
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
      {/* Par technicien */}
      <div>
        <div style={{fontSize:13,fontWeight:700,color:"#1B4F8A",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #EEF4FF"}}>Par technicien</div>
        <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"12px 16px"}}>
          {techList.length===0&&<div style={{fontSize:12,color:"#9CA3AF",textAlign:"center",padding:12}}>Aucune donnée</div>}
          {techList.map(([t,n])=>(
            <div key={t} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:12,fontWeight:600,color:"#1B4F8A",width:36,flexShrink:0,background:"#EEF4FF",textAlign:"center",padding:"2px 4px",borderRadius:4}}>{t}</span>
              <div style={{flex:1,background:"#F5F6F8",borderRadius:20,height:6,overflow:"hidden"}}>
                <div style={{height:6,borderRadius:20,background:"#1B4F8A",width:Math.round((n/(techList[0]?.[1]||1))*100)+"%"}}/>
              </div>
              <span style={{fontSize:12,fontWeight:700,color:"#1A1A2E",width:24,textAlign:"right"}}>{n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top clients */}
      <div>
        <div style={{fontSize:13,fontWeight:700,color:"#1B4F8A",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #EEF4FF"}}>Top 5 clients</div>
        <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"12px 16px"}}>
          {clientList.length===0&&<div style={{fontSize:12,color:"#9CA3AF",textAlign:"center",padding:12}}>Aucune donnée</div>}
          {clientList.map(([c,n],i)=>(
            <div key={c} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:10,color:"#9CA3AF",width:16,textAlign:"center"}}>{i+1}</span>
              <span style={{fontSize:12,flex:1,fontWeight:500,color:"#1A1A2E",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c}</span>
              <span style={{fontSize:12,fontWeight:700,color:"#1B4F8A",background:"#EEF4FF",padding:"2px 8px",borderRadius:10}}>{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Matériel */}
    <div style={{fontSize:13,fontWeight:700,color:"#1B4F8A",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #EEF4FF"}}>Matériel à renouveler</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:16}}>
      {card("À recommander",nAReco,"Pièces en attente","#E8720C")}
      {card("Commandées",nCommande,"Pièces commandées","#22863A")}
      {card("Total pièces",piecesFilt.length,"Sur la période","#6B7280")}
    </div>
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"14px 16px"}}>
      <div style={{fontSize:12,fontWeight:600,color:"#6B7280",marginBottom:8}}>Top pièces commandées</div>
      {pieceList.length===0&&<div style={{fontSize:12,color:"#9CA3AF",textAlign:"center",padding:8}}>Aucune donnée</div>}
      {pieceList.map(([d,n],i)=>(
        <div key={d} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
          <span style={{fontSize:10,color:"#9CA3AF",width:16,textAlign:"center"}}>{i+1}</span>
          <span style={{fontSize:12,flex:1,color:"#1A1A2E"}}>{d}</span>
          <span style={{fontSize:12,fontWeight:700,color:"#E8720C",background:"#FFF8E1",padding:"2px 8px",borderRadius:10}}>{n}×</span>
        </div>
      ))}
    </div>
  </div>);
}

// ─── PAGE SUIVI MATÉRIEL ─────────────────────────────────────────────────
function PageSuivi(){
  const [pieces,setPieces]=useState([]);const [loading,setLoading]=useState(true);const [filtre,setFiltre]=useState("actif");const [ouverts,setOuverts]=useState({});

  const ST={
    A_recommander:{label:"À recommander",color:"#E8720C",bg:"#FFF8E1"},
    Commande:{label:"Commandé",color:"#22863A",bg:"#F0FFF4"},
  };

  useEffect(()=>{
    db.get("suivi_pieces","?order=created_at.desc").then(d=>{
      setPieces(Array.isArray(d)?d:[]);setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  async function changerStatut(id,statut){
    await db.patch("suivi_pieces","?id=eq."+id,{statut,updated_at:new Date().toISOString()});
    setPieces(prev=>prev.map(p=>p.id===id?{...p,statut}:p));
  }

  async function commander(id){await changerStatut(id,"Commande");}

  const filtrees=filtre==="actif"
    ?pieces.filter(p=>p.statut!=="Commande")
    :filtre==="Commande"
    ?pieces.filter(p=>p.statut==="Commande")
    :pieces;

  const parDE={};
  filtrees.forEach(p=>{
    if(!parDE[p.de])parDE[p.de]={de:p.de,client:p.client,pieces:[]};
    parDE[p.de].pieces.push(p);
  });
  const deList=Object.keys(parDE).sort();

  const nAReco=pieces.filter(p=>p.statut==="A_recommander"||!p.statut).length;
  const nCom=pieces.filter(p=>p.statut==="Commande").length;

  function toggleDE(de){setOuverts(prev=>({...prev,[de]:!prev[de]}));}

  return(<div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <h2 style={{fontSize:20,fontWeight:700,margin:0}}>Matériel à renouveler</h2>
      {nAReco>0&&<span style={{background:"#FFF8E1",color:"#E8720C",fontSize:12,padding:"4px 12px",borderRadius:20,fontWeight:600}}>{nAReco} à recommander</span>}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
      {[
        {id:"actif",label:"À recommander",n:nAReco,color:"#E8720C"},
        {id:"Commande",label:"Commandé",n:nCom,color:"#22863A"},
        {id:"tous",label:"Tout voir",n:pieces.length,color:"#6B7280"},
      ].map(s=>(
        <div key={s.id} onClick={()=>setFiltre(s.id)} style={{background:"#fff",borderRadius:10,border:"1.5px solid "+(filtre===s.id?s.color:"#E2E6EA"),padding:"12px",cursor:"pointer",textAlign:"center",transition:"border-color .15s"}}>
          <div style={{fontSize:22,fontWeight:700,color:filtre===s.id?s.color:"#1A1A2E"}}>{s.n}</div>
          <div style={{fontSize:11,color:"#6B7280",marginTop:2}}>{s.label}</div>
        </div>
      ))}
    </div>

    {loading&&<div style={{textAlign:"center",padding:32,color:"#9CA3AF"}}>Chargement…</div>}
    {!loading&&deList.length===0&&<div style={{textAlign:"center",padding:32,color:"#9CA3AF",background:"#fff",borderRadius:10,border:"1px solid #E2E6EA"}}>Aucune pièce dans cette catégorie</div>}

    {deList.map(de=>{
      const g=parDE[de];
      const isOpen=!!ouverts[de];
      const nReco=g.pieces.filter(p=>p.statut==="A_recommander"||!p.statut).length;
      return(<div key={de} style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",marginBottom:8,overflow:"hidden"}}>
        <div onClick={()=>toggleDE(de)} style={{background:"#F8F9FA",padding:"10px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",borderBottom:isOpen?"1px solid #E2E6EA":"none"}}>
          <span style={{fontSize:13,fontWeight:700,color:"#1B4F8A"}}>{de}</span>
          <span style={{fontSize:13,color:"#6B7280"}}>— {g.client||"—"}</span>
          <span style={{marginLeft:"auto",fontSize:11,background:"#F5F6F8",padding:"2px 8px",borderRadius:12,color:"#6B7280"}}>{g.pieces.length} pièce{g.pieces.length>1?"s":""}</span>
          {nReco>0&&<span style={{fontSize:10,background:"#FFF8E1",color:"#E8720C",padding:"2px 6px",borderRadius:10,fontWeight:600}}>{nReco} à reco.</span>}
          <span style={{fontSize:14,color:"#9CA3AF"}}>{isOpen?"▲":"▼"}</span>
        </div>
        {isOpen&&<div>
          {g.pieces.map(p=>{
            const estCommande=p.statut==="Commande";
            const sc=estCommande?ST.Commande:ST.A_recommander;
            return(<div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:"1px solid #F5F6F8"}}>
              <div style={{flex:1,minWidth:120}}>
                <span style={{fontSize:13,fontWeight:600,textDecoration:estCommande?"line-through":"none",color:estCommande?"#9CA3AF":"#1A1A2E"}}>{p.designation}</span>
                {p.reference&&<span style={{fontSize:11,color:"#6B7280",marginLeft:8,background:"#F5F6F8",padding:"1px 6px",borderRadius:4}}>{p.reference}</span>}
              </div>
              <span style={{fontSize:10,background:p.source==="auto"?"#F0FFF4":"#EEF4FF",color:p.source==="auto"?"#22863A":"#1B4F8A",padding:"2px 6px",borderRadius:10}}>{p.source==="auto"?"Auto":"Manuel"}</span>
              <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:sc.bg,color:sc.color}}>{sc.label}</span>
              {!estCommande
                ?<button onClick={()=>commander(p.id)} style={{fontSize:12,padding:"5px 14px",borderRadius:6,border:"none",background:"#22863A",color:"#fff",cursor:"pointer",fontWeight:600}}>✓ Commander</button>
                :<button onClick={()=>changerStatut(p.id,"A_recommander")} style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:"1px solid #E2E6EA",background:"#fff",color:"#6B7280",cursor:"pointer"}}>↩ Annuler</button>
              }
            </div>);
          })}
        </div>}
      </div>);
    })}
  </div>);
}


// ─── TABLEAU DE BORD ─────────────────────────────────────────────────────
function PageDashboard({fiches,pieces,commandesResume,onOuvrirFiche,onNaviguer}){
  const [delaisMap,setDelaisMap]=useState({});
  useEffect(()=>{
    if(!fiches.length){setDelaisMap({});return;}
    const ids=fiches.map(f=>f.id).join(",");
    db.get("fiche_valeurs","?fiche_id=in.("+ids+")&champ_id=in.(date_entree,delai_valeur,delai_unite)").then(rows=>{
      if(!Array.isArray(rows))return;
      const m={};
      rows.forEach(r=>{if(!m[r.fiche_id])m[r.fiche_id]={};m[r.fiche_id][r.champ_id]=r.valeur;});
      setDelaisMap(m);
    }).catch(()=>{});
  },[fiches.map(f=>f.id).join(",")]);

  const devisEnAttente=fiches.filter(f=>(f.statut_chantier||"A_demonter")==="Devis");

  const fichesActives=fiches.filter(f=>!["Termine","Abandonne"].includes(f.statut_chantier||"A_demonter"));
  const avecUrgence=fichesActives
    .map(f=>({f,urgence:delaisMap[f.id]?urgenceInfo(delaisMap[f.id]):null}))
    .filter(x=>x.urgence&&(x.urgence.id==="urgent"||x.urgence.id==="rapide"))
    .sort((a,b)=>a.urgence.jours-b.urgence.jours);
  const fichesUrgentes=avecUrgence.filter(x=>x.urgence.id==="urgent");
  const fichesRapides=avecUrgence.filter(x=>x.urgence.id==="rapide");

  const fichesParDe={};fiches.forEach(f=>{if(f.de)fichesParDe[f.de.trim().toLowerCase()]=f;});
  const piecesAReco=pieces.filter(p=>p.statut==="A_recommander"||!p.statut);
  const parDEReco={};
  piecesAReco.forEach(p=>{if(!parDEReco[p.de])parDEReco[p.de]={de:p.de,client:p.client,n:0};parDEReco[p.de].n++;});
  const listeDEReco=Object.values(parDEReco);

  const commandesAlerte=(commandesResume?.retard||0)+(commandesResume?.aCompleter||0);
  const rienASignaler=devisEnAttente.length===0&&fichesUrgentes.length===0&&fichesRapides.length===0&&listeDEReco.length===0&&commandesAlerte===0;

  const ligneFiche=(f,detail)=>(
    <div key={f.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,background:"#fff",border:"1px solid #F3D9A8",borderRadius:6,padding:"8px 10px",marginBottom:6}}>
      <div style={{fontSize:12,minWidth:0}}>
        <strong>{f.de}</strong> — {f.client||"—"}
        {detail&&<div style={{fontSize:11,color:"#9CA3AF"}}>{detail}</div>}
      </div>
      <button onClick={()=>onOuvrirFiche(f)} style={{...S.p2,fontSize:11,padding:"5px 10px",whiteSpace:"nowrap"}}>📂 Ouvrir</button>
    </div>
  );

  const section=(titre,color,bg,contenu)=>(
    <div style={{background:bg,border:"1px solid "+color,borderRadius:10,padding:"12px 14px",marginBottom:16}}>
      <div style={{fontSize:13,fontWeight:700,color,marginBottom:8}}>{titre}</div>
      {contenu}
    </div>
  );

  return(<div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
    <h2 style={{fontSize:20,fontWeight:700,margin:"0 0 16px"}}>🏠 Tableau de bord</h2>

    {rienASignaler&&<div style={{textAlign:"center",padding:40,color:"#22863A",background:"#F0FFF4",borderRadius:10,border:"1px solid #22863A",fontWeight:600}}>🎉 Rien à signaler — tout est à jour</div>}

    {fichesUrgentes.length>0&&section("🔴 Fiches urgentes ("+fichesUrgentes.length+")","#D73A49","#FFF5F5",
      fichesUrgentes.map(({f,urgence})=>ligneFiche(f,urgence.label+" — échéance le "+urgence.echeance))
    )}

    {fichesRapides.length>0&&section("🟡 À faire rapidement ("+fichesRapides.length+")","#CA8A04","#FFFBEB",
      fichesRapides.map(({f,urgence})=>ligneFiche(f,urgence.label+" — échéance le "+urgence.echeance))
    )}

    {devisEnAttente.length>0&&section("⚠ Devis en attente ("+devisEnAttente.length+")","#E8720C","#FFF8E1",
      devisEnAttente.map(f=>ligneFiche(f,"Devis à préparer"))
    )}

    {commandesAlerte>0&&section("📦 Commandes fournisseurs","#D73A49","#FFF5F5",<>
      <div style={{fontSize:12,color:"#6B7280",marginBottom:8}}>{commandesResume.retard} en retard · {commandesResume.aCompleter} à compléter</div>
      <button onClick={()=>onNaviguer("commandes")} style={{...S.p1,fontSize:12,padding:"6px 14px"}}>📦 Voir le suivi des commandes →</button>
    </>)}

    {listeDEReco.length>0&&section("🔧 Matériel à recommander ("+listeDEReco.length+")","#E8720C","#FFF8E1",
      listeDEReco.map(d=>{
        const ficheLiee=fichesParDe[(d.de||"").trim().toLowerCase()];
        return(<div key={d.de} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,background:"#fff",border:"1px solid #F3D9A8",borderRadius:6,padding:"8px 10px",marginBottom:6}}>
          <div style={{fontSize:12}}>
            <strong>{d.de||"—"}</strong> — {d.client||"—"}
            <div style={{fontSize:11,color:"#9CA3AF"}}>{d.n} pièce{d.n>1?"s":""} à recommander</div>
          </div>
          {ficheLiee
            ?<button onClick={()=>onOuvrirFiche(ficheLiee)} style={{...S.p2,fontSize:11,padding:"5px 10px",whiteSpace:"nowrap"}}>📂 Ouvrir</button>
            :<button onClick={()=>onNaviguer("suivi")} style={{...S.p2,fontSize:11,padding:"5px 10px",whiteSpace:"nowrap"}}>🔧 Voir</button>}
        </div>);
      })
    )}
  </div>);
}

// ─── PAGE PLANNING KANBAN ───────────────────────────────────────────────
function PagePlanning({fiches,onOuvrirFiche,onStatutChange}){
  const [filtTech,setFiltTech]=useState("tous");const [showTermine,setShowTermine]=useState(false);const [showAbandonne,setShowAbandonne]=useState(false);const [showDevisEnvoye,setShowDevisEnvoye]=useState(false);
  const [recherche,setRecherche]=useState("");
  const [dragId,setDragId]=useState(null);const [dragOver,setDragOver]=useState(null);
  const [delaisMap,setDelaisMap]=useState({});
  useEffect(()=>{
    if(!fiches.length){setDelaisMap({});return;}
    const ids=fiches.map(f=>f.id).join(",");
    db.get("fiche_valeurs","?fiche_id=in.("+ids+")&champ_id=in.(date_entree,delai_valeur,delai_unite)").then(rows=>{
      if(!Array.isArray(rows))return;
      const m={};
      rows.forEach(r=>{if(!m[r.fiche_id])m[r.fiche_id]={};m[r.fiche_id][r.champ_id]=r.valeur;});
      setDelaisMap(m);
    }).catch(()=>{});
  },[fiches.map(f=>f.id).join(",")]);
  const statuts=(()=>{let s=STATUTS_CHANTIER;if(!showTermine)s=s.filter(x=>x.id!=="Termine");if(!showAbandonne)s=s.filter(x=>x.id!=="Abandonne");if(!showDevisEnvoye)s=s.filter(x=>x.id!=="Devis_envoye");return s;})();
  const rq=recherche.trim().toLowerCase();
  const fichesFilt=fiches.filter(f=>{
    const matchTech=filtTech==="tous"||(f.tech_entree||"")==filtTech;
    const matchQ=!rq||(f.de||"").toLowerCase().includes(rq)||(f.client||"").toLowerCase().includes(rq)||(f.materiel||"").toLowerCase().includes(rq);
    return matchTech&&matchQ;
  });
  const parStatut={};STATUTS_CHANTIER.forEach(s=>{parStatut[s.id]=[];});
  fichesFilt.forEach(f=>{const sid=f.statut_chantier||"A_demonter";if(parStatut[sid])parStatut[sid].push(f);});
  const devisCount=parStatut["Devis"]?.length||0;
  const techs=[...new Set(fiches.map(f=>f.tech_entree).filter(Boolean))];

  function handleDragStart(e,ficheId){
    setDragId(ficheId);
    e.dataTransfer.effectAllowed="move";
    e.dataTransfer.setData("text/plain",ficheId);
  }
  function handleDragOver(e,statutId){
    e.preventDefault();e.dataTransfer.dropEffect="move";
    setDragOver(statutId);
  }
  function handleDrop(e,statutId){
    e.preventDefault();
    if(dragId&&dragId!==statutId){
      onStatutChange(dragId,statutId);
    }
    setDragId(null);setDragOver(null);
  }
  function handleDragEnd(){setDragId(null);setDragOver(null);}

  // Touch drag & drop pour tablette
  function handleTouchStart(e,ficheId){setDragId(ficheId);}
  function handleTouchEnd(e,ficheId){
    const touch=e.changedTouches[0];
    const el=document.elementFromPoint(touch.clientX,touch.clientY);
    const col=el?.closest("[data-statut]");
    if(col){const newStatut=col.getAttribute("data-statut");if(newStatut&&newStatut!==ficheId)onStatutChange(ficheId,newStatut);}
    setDragId(null);setDragOver(null);
  }

  return(<div style={{maxWidth:1200,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <h2 style={{fontSize:20,fontWeight:700,margin:0}}>Planning atelier</h2>
        {devisCount>0&&<span style={{background:"#FFF8E1",color:"#E8720C",fontSize:12,padding:"3px 10px",borderRadius:20,fontWeight:600}}>⚠ {devisCount} devis en attente</span>}
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <input value={recherche} onChange={e=>setRecherche(e.target.value)} placeholder="🔍 Client, N° DE, lieu..." style={{...S.inp,width:170}}/>
        <select value={filtTech} onChange={e=>setFiltTech(e.target.value)} style={{...S.sel,width:130}}>
          <option value="tous">Tous</option>
          {techs.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={()=>setShowDevisEnvoye(!showDevisEnvoye)} style={{...S.p2,fontSize:12,padding:"5px 12px",color:"#0891B2",borderColor:"#0891B2"}}>{showDevisEnvoye?"Masquer Devis envoyé":"Afficher Devis envoyé"}</button>
        <button onClick={()=>setShowTermine(!showTermine)} style={{...S.p2,fontSize:12,padding:"5px 12px"}}>{showTermine?"Masquer Terminé":"Afficher Terminé"}</button>
        <button onClick={()=>setShowAbandonne(!showAbandonne)} style={{...S.p2,fontSize:12,padding:"5px 12px",color:"#9B59B6",borderColor:"#9B59B6"}}>{showAbandonne?"Masquer Abandonné":"Afficher Abandonné"}</button>
      </div>
    </div>
    <p style={{fontSize:11,color:"#9CA3AF",margin:"0 0 10px",textAlign:"right"}}>💡 Glissez les cartes entre les colonnes pour changer le statut</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat("+statuts.length+",1fr)",gap:10,overflowX:"auto"}}>
      {statuts.map(s=>(
        <div key={s.id}
          data-statut={s.id}
          onDragOver={e=>handleDragOver(e,s.id)}
          onDrop={e=>handleDrop(e,s.id)}
          onDragEnd={handleDragEnd}
          style={{background:dragOver===s.id?"#EEF4FF":"#fff",borderRadius:10,border:"1.5px solid "+(dragOver===s.id?"#1B4F8A":"#E2E6EA"),padding:"10px 8px",minHeight:120,transition:"background .15s,border-color .15s"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:12,fontWeight:600,color:s.color}}>● {s.label}</span>
            <span style={{fontSize:11,background:"#F5F6F8",border:"1px solid #E2E6EA",borderRadius:20,padding:"1px 8px",color:"#6B7280"}}>{(parStatut[s.id]||[]).length}</span>
          </div>
          {(parStatut[s.id]||[]).length===0&&<p style={{fontSize:12,color:"#9CA3AF",textAlign:"center",padding:"16px 0",margin:0}}>Vide</p>}
          {(parStatut[s.id]||[]).map(f=><CarteKanban key={f.id} f={f} s={s} urgence={delaisMap[f.id]?urgenceInfo(delaisMap[f.id]):null} onOuvrirFiche={onOuvrirFiche} onStatutChange={onStatutChange} onDragStart={handleDragStart} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} isDragging={dragId===f.id}/>)}
        </div>
      ))}
    </div>
  </div>);
}
function CarteKanban({f,s,urgence,onOuvrirFiche,onStatutChange,onDragStart,onTouchStart,onTouchEnd,isDragging}){
  const [ouvert,setOuvert]=useState(false);
  return(<div
    draggable={true}
    onDragStart={e=>onDragStart(e,f.id)}
    onTouchStart={()=>onTouchStart(null,f.id)}
    onTouchEnd={e=>onTouchEnd(e,f.id)}
    style={{background:isDragging?"#EEF4FF":"#F8F9FA",border:"1px solid "+(isDragging?"#1B4F8A":"#E2E6EA"),borderRadius:8,marginBottom:8,cursor:"grab",opacity:isDragging?0.6:1,transition:"opacity .15s,border-color .15s",userSelect:"none"}}>
    {urgence&&<div style={{height:4,borderRadius:"8px 8px 0 0",background:urgence.color}}/>}
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",cursor:"pointer"}} onClick={()=>setOuvert(!ouvert)}>
      <span style={{fontSize:13,color:"#9CA3AF",cursor:"grab"}}>⠿</span>
      <div style={{flex:1,minWidth:0}}>
        <span style={{fontSize:12,fontWeight:700,color:"#1B4F8A"}}>{f.de}</span>
        <span style={{fontSize:12,color:"#1A1A2E",marginLeft:6,fontWeight:500}}>{f.client||"—"}</span>
        {urgence&&<span style={{display:"block",fontSize:10,fontWeight:700,color:urgence.color,marginTop:2}}>● {urgence.label}</span>}
      </div>
      <span style={{fontSize:13,color:"#9CA3AF"}}>{ouvert?"▲":"▼"}</span>
    </div>
    {ouvert&&<div style={{padding:"8px 10px",borderTop:"1px solid #E2E6EA",background:"#fff"}}>
      <div style={{fontSize:11,color:"#6B7280",marginBottom:4}}>{f.materiel||"Moteur"}</div>
      <div style={{fontSize:11,color:"#9CA3AF",marginBottom:8}}>Entrée le {fmt(f.created_at)}</div>
      {urgence&&<div style={{fontSize:11,fontWeight:600,color:urgence.color,background:urgence.bg,borderRadius:6,padding:"5px 8px",marginBottom:8}}>{urgence.label} — échéance le {urgence.echeance}</div>}
      <select value={f.statut_chantier||"A_demonter"} onChange={e=>onStatutChange(f.id,e.target.value)} style={{...S.sel,marginBottom:8,fontSize:12}}>
        {STATUTS_CHANTIER.map(st=><option key={st.id} value={st.id}>{st.label}</option>)}
      </select>
      <button onClick={()=>onOuvrirFiche(f)} style={{width:"100%",fontSize:11,padding:"5px",borderRadius:6,border:"1px solid #1B4F8A",background:"#EEF4FF",color:"#1B4F8A",cursor:"pointer",fontWeight:600}}>📂 Ouvrir la fiche</button>
    </div>}
  </div>);
}

// ─── PAGE ACCUEIL EXPLORATEUR ───────────────────────────────────────────

// ─── FICHE ITEM (niveau 3 : Lieu/Identification) ────────────────────────
function FicheItem({f,onOpen,onApercu,onDelete,onStatutChange,categories,onDupliquer}){
  const [ouvert,setOuvert]=useState(false);
  const [photos,setPhotos]=useState([]);
  const [loadingP,setLoadingP]=useState(false);
  const [confirmSupprPhotos,setConfirmSupprPhotos]=useState(false);
  const [confirmSupprFiche,setConfirmSupprFiche]=useState(false);
  const [ajoutPhoto,setAjoutPhoto]=useState(false);
  const [catPhoto,setCatPhoto]=useState("");
  const [uploadEnCours,setUploadEnCours]=useState(false);
  const fileRef=React.useRef();
  const ch=cheminFiche({client:f.client,de:f.de,materiel_lieu:f.materiel});
  const st=statutInfo(f.statut_chantier);

  async function toggle(){
    if(!ouvert&&photos.length===0){
      setLoadingP(true);
      try{const p=await db.get("fiche_photos","?fiche_id=eq."+f.id+"&order=created_at");
      if(Array.isArray(p))setPhotos(p.map(pp=>({...pp,url:db.photoUrl(pp.storage_path)})));}
      catch(e){}finally{setLoadingP(false);}
    }
    setOuvert(!ouvert);
  }

  async function supprimerPhotos(){
    try{await db.del("fiche_photos","?fiche_id=eq."+f.id);setPhotos([]);setConfirmSupprPhotos(false);}
    catch(e){alert("Erreur: "+e.message);}
  }

  async function supprimerFiche(){
    try{
      await db.del("fiche_photos","?fiche_id=eq."+f.id);
      await db.del("fiche_valeurs","?fiche_id=eq."+f.id);
      await db.del("suivi_pieces","?fiche_id=eq."+f.id);
      await db.del("fiche_historique","?fiche_id=eq."+f.id);
      await db.del("fiches","?id=eq."+f.id);
      onDelete(f.id);
    }catch(e){alert("Erreur: "+e.message);}
  }

  async function uploadPhoto(e){
    const file=e.target.files[0];if(!file||!catPhoto)return;
    setUploadEnCours(true);
    try{
      const ext=file.name.split(".").pop();
      const slug=catPhoto.toLowerCase().replace(/[^a-z0-9]/g,"_");
      const path=ch.chemin+"/"+slug+"_"+Date.now()+"."+ext;
      const {data,error}=await window._supabase.storage.from("photos").upload(path,file,{upsert:true});
      if(error)throw error;
      const rec=await db.post("fiche_photos",{fiche_id:f.id,storage_path:path,nom_fichier:file.name,categorie_nom:catPhoto,etape:""});
      if(rec&&rec[0])setPhotos(prev=>[...prev,{...rec[0],url:db.photoUrl(path)}]);
      setAjoutPhoto(false);setCatPhoto("");
    }catch(err){alert("Erreur upload: "+err.message);}
    setUploadEnCours(false);
  }

  async function handleZip(){
    // Charger les photos si pas encore fait
    let phots=photos;
    if(phots.length===0){
      try{const p=await db.get("fiche_photos","?fiche_id=eq."+f.id+"&order=created_at");
      if(Array.isArray(p)){phots=p.map(pp=>({...pp,url:db.photoUrl(pp.storage_path)}));setPhotos(phots);}}
      catch(e){}
    }
    // Télécharger même sans photos — on passe les valeurs pour le PDF
    const vals=await db.get("fiche_valeurs","?fiche_id=eq."+f.id+"&order=created_at");
    const v=Array.isArray(vals)?Object.fromEntries(vals.map(r=>[r.champ_id,r.valeur])):{};
    v.de=f.de;v.client=f.client;v.materiel_lieu=f.materiel;
    await telechargerZip(phots,v,ch.chemin.replace(/\//g,"_")||f.de);
  }

  return(<div style={{marginLeft:20,marginBottom:6,borderLeft:"2px solid #E2E6EA",paddingLeft:12}}>
    {/* En-tête lieu/identification */}
    <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 10px",background:"#fff",borderRadius:8,border:"1px solid #E2E6EA"}} onClick={toggle}>
      <span style={{fontSize:15}}>{ouvert?"📂":"📁"}</span>
      <div style={{flex:1,minWidth:0}}>
        <p style={{margin:0,fontSize:13,fontWeight:600,color:"#1B4F8A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.materiel||"Sans identification"}</p>
        <p style={{margin:0,fontSize:11,color:"#9CA3AF"}}>{fmt(f.created_at)}</p>
      </div>
      <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:12,whiteSpace:"nowrap",background:st.bg,color:st.color}}>{st.label}</span>
      <span style={{fontSize:13,color:"#9CA3AF"}}>{ouvert?"▲":"▼"}</span>
    </div>

    {ouvert&&<div style={{padding:"10px 12px",background:"#fff",borderRadius:"0 0 8px 8px",border:"1px solid #E2E6EA",borderTop:"none"}}>
      {/* Statut */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"6px 10px",background:"#F8F9FA",borderRadius:6}}>
        <span style={{fontSize:12,fontWeight:600,color:"#6B7280",flexShrink:0}}>Statut :</span>
        <select value={f.statut_chantier||"A_demonter"} onChange={e=>onStatutChange(f.id,e.target.value)} style={{...S.sel,flex:1,fontSize:12}}>
          {STATUTS_CHANTIER.map(st2=><option key={st2.id} value={st2.id}>{st2.label}</option>)}
        </select>
      </div>

      {/* Actions */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        <button onClick={()=>onOpen(f)} style={{...S.p1,fontSize:12,padding:"6px 12px"}}>📝 Ouvrir fiche</button><button onClick={()=>{onApercu(f);}} style={{...S.p2,fontSize:12,padding:"6px 12px"}}>👁 Aperçu</button><button onClick={()=>onDupliquer&&onDupliquer(f)} style={{...S.p2,fontSize:12,padding:"6px 12px"}}>📋 Dupliquer</button>
        <button onClick={handleZip} style={{...S.p2,fontSize:12,padding:"6px 12px"}}>📥 ZIP + PDF</button>
        <button onClick={()=>setAjoutPhoto(!ajoutPhoto)} style={{...S.p2,fontSize:12,padding:"6px 12px",color:"#22863A",borderColor:"#22863A"}}>📷 Ajouter photo</button>
        <button onClick={()=>setConfirmSupprPhotos(true)} style={{...S.p2,fontSize:12,padding:"6px 12px",color:"#E8720C",borderColor:"#E8720C"}}>🗑 Suppr. photos</button>
        <button onClick={()=>setConfirmSupprFiche(true)} style={{...S.pDanger,fontSize:12,padding:"6px 12px"}}>🗑 Suppr. fiche</button>
      </div>

      {/* Ajout photo */}
      {ajoutPhoto&&<div style={{background:"#F0FFF4",border:"1px solid #22863A",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
        <div style={{fontSize:12,fontWeight:600,color:"#22863A",marginBottom:8}}>📷 Ajouter une photo</div>
        <select value={catPhoto} onChange={e=>setCatPhoto(e.target.value)} style={{...S.sel,marginBottom:8,fontSize:12}}>
          <option value="">— Choisir une catégorie</option>
          {(categories||[]).map(c=><option key={c.nom} value={c.nom}>{c.nom}</option>)}
        </select>
        {catPhoto&&<div style={{display:"flex",gap:8}}>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={uploadPhoto} style={{display:"none"}}/>
          <button onClick={()=>fileRef.current.click()} disabled={uploadEnCours} style={{...S.p1,fontSize:12,background:"#22863A",opacity:uploadEnCours?0.6:1}}>{uploadEnCours?"⏳ Upload...":"📷 Choisir photo"}</button>
          <button onClick={()=>{setAjoutPhoto(false);setCatPhoto("");}} style={{...S.p2,fontSize:12}}>Annuler</button>
        </div>}
      </div>}

      {/* Confirmations */}
      {confirmSupprPhotos&&<div style={{background:"#FFF8E1",border:"1px solid #E8720C",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
        <p style={{fontSize:12,fontWeight:700,color:"#E8720C",margin:"0 0 6px"}}>⚠️ Supprimer les photos ?</p>
        <p style={{fontSize:11,color:"#6B7280",margin:"0 0 10px"}}>La fiche et toutes les données sont conservées.</p>
        <div style={{display:"flex",gap:8}}>
          <button onClick={supprimerPhotos} style={{...S.p1,fontSize:12,background:"#E8720C"}}>✅ Confirmer</button>
          <button onClick={()=>setConfirmSupprPhotos(false)} style={{...S.p2,fontSize:12}}>Annuler</button>
        </div>
      </div>}
      {confirmSupprFiche&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
        <p style={{fontSize:12,fontWeight:700,color:"#D73A49",margin:"0 0 6px"}}>⚠️ Supprimer toute la fiche ?</p>
        <p style={{fontSize:11,color:"#6B7280",margin:"0 0 10px"}}>Irréversible — fiche, données, photos et historique supprimés.</p>
        <div style={{display:"flex",gap:8}}>
          <button onClick={supprimerFiche} style={{...S.pDanger,fontSize:12}}>🗑 Oui, tout supprimer</button>
          <button onClick={()=>setConfirmSupprFiche(false)} style={{...S.p2,fontSize:12}}>Annuler</button>
        </div>
      </div>}

      {/* Photos */}
      {loadingP&&<div style={{fontSize:12,color:"#9CA3AF",textAlign:"center",padding:8}}>Chargement…</div>}
      {photos.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(72px,1fr))",gap:6,marginTop:6}}>
        {photos.map((p,i)=>(
          <div key={i} style={{position:"relative",cursor:"pointer"}} onClick={()=>window.open(p.url,"_blank")}>
            <img src={p.url} alt={p.categorie_nom||""} style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:6,border:"1px solid #E2E6EA"}}/>
            {p.categorie_nom&&<div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.6)",color:"#fff",fontSize:8,padding:"2px 3px",borderRadius:"0 0 6px 6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.categorie_nom}</div>}
          </div>
        ))}
      </div>}
      {!loadingP&&photos.length===0&&<div style={{fontSize:12,color:"#9CA3AF",textAlign:"center",padding:8}}>Aucune photo — utilisez "Ajouter photo" ou prenez des photos dans la fiche</div>}
    </div>}
  </div>);
}

// ─── DOSSIER DE (niveau 2) ───────────────────────────────────────────────
function DossierDE({de,fiches,onOpen,onApercu,onDelete,onStatutChange,categories,onDupliquer}){
  const [ouvert,setOuvert]=useState(false);
  return(<div style={{marginLeft:16,marginBottom:6,borderLeft:"2px solid #D6E4F7",paddingLeft:12}}>
    <div onClick={()=>setOuvert(!ouvert)} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 12px",background:"#EEF4FF",borderRadius:8,border:"1px solid #D6E4F7"}}>
      <span style={{fontSize:15}}>{ouvert?"📂":"📁"}</span>
      <span style={{fontSize:13,fontWeight:700,color:"#1B4F8A",flex:1}}>{de}</span>
      <span style={{fontSize:11,color:"#6B7280",background:"#fff",padding:"2px 8px",borderRadius:10,border:"1px solid #E2E6EA"}}>{fiches.length} fiche{fiches.length>1?"s":""}</span>
      <span style={{fontSize:13,color:"#9CA3AF"}}>{ouvert?"▲":"▼"}</span>
    </div>
    {ouvert&&<div style={{marginTop:6}}>
      {fiches.map(f=><FicheItem key={f.id} f={f} onOpen={onOpen} onApercu={onApercu} onDelete={onDelete} onStatutChange={onStatutChange} categories={categories} onDupliquer={onDupliquer}/>)}
    </div>}
  </div>);
}

// ─── DOSSIER CLIENT (niveau 1) ───────────────────────────────────────────
function DossierClient({client,fiches,onOpen,onApercu,onDelete,onStatutChange,categories,onDupliquer}){
  const [ouvert,setOuvert]=useState(false);
  // Grouper par DE
  const parDE={};
  fiches.forEach(f=>{const d=f.de||"Sans DE";if(!parDE[d])parDE[d]=[];parDE[d].push(f);});
  const deList=Object.keys(parDE).sort();
  const nbDE=deList.length;
  return(<div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",marginBottom:8,overflow:"hidden"}}>
    <div onClick={()=>setOuvert(!ouvert)} style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:"#F8F9FA"}}>
      <span style={{fontSize:16}}>{ouvert?"📂":"📁"}</span>
      <div style={{flex:1,minWidth:0}}>
        <p style={{margin:0,fontSize:14,fontWeight:700,color:"#1A1A2E",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{client}</p>
        <p style={{margin:0,fontSize:11,color:"#9CA3AF"}}>{nbDE} N° DE · {fiches.length} fiche{fiches.length>1?"s":""}</p>
      </div>
      <span style={{fontSize:13,color:"#9CA3AF"}}>{ouvert?"▲":"▼"}</span>
    </div>
    {ouvert&&<div style={{padding:"8px 0 8px 0"}}>
      {deList.map(de=><DossierDE key={de} de={de} fiches={parDE[de]} onOpen={onOpen} onApercu={onApercu} onDelete={onDelete} onStatutChange={onStatutChange} categories={categories} onDupliquer={onDupliquer}/>)}
    </div>}
  </div>);
}

// ─── PAGE ACCUEIL ────────────────────────────────────────────────────────
function PageAccueil({fiches,setFiches,onNew,onOpen,onApercu,onStatutChange,categories,onDupliquer}){
  const [loading,setLoading]=useState(true);const [q,setQ]=useState("");const [fs,setFs]=useState("Tous");
  useEffect(()=>{db.get("fiches","?order=created_at.desc").then(d=>{setFiches(Array.isArray(d)?d:[]);setLoading(false);}).catch(()=>setLoading(false));},[]);
  async function onStatutChange(ficheId,newStatut){await db.patch("fiches","?id=eq."+ficheId,{statut_chantier:newStatut});setFiches(prev=>prev.map(f=>f.id===ficheId?{...f,statut_chantier:newStatut}:f));}
  function onDelete(id){setFiches(prev=>prev.filter(f=>f.id!==id));}
  const filtrees=fiches.filter(f=>{
    const qq=q.toLowerCase();
    const matchQ=!qq||(f.de||"").toLowerCase().includes(qq)||(f.client||"").toLowerCase().includes(qq)||(f.materiel||"").toLowerCase().includes(qq);
    const matchS=fs==="Tous"||(f.statut_chantier||"A_demonter")===fs;
    return matchQ&&matchS;
  });
  const parClient={};filtrees.forEach(f=>{const c=f.client||"Sans client";if(!parClient[c])parClient[c]=[];parClient[c].push(f);});
  const clientList=Object.keys(parClient).sort();
  const devisCount=fiches.filter(f=>(f.statut_chantier||"A_demonter")==="Devis").length;
  return(<div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,margin:0}}>Fiches atelier</h1>
          <p style={{fontSize:13,color:"#6B7280",margin:"3px 0 0"}}>{clientList.length} client{clientList.length>1?"s":""} · {fiches.length} fiche{fiches.length>1?"s":""}</p>
        </div>
        {devisCount>0&&<span style={{background:"#FFF8E1",color:"#E8720C",fontSize:12,padding:"4px 12px",borderRadius:20,fontWeight:600}}>⚠ {devisCount} devis en attente</span>}
      </div>
      <button style={S.p1} onClick={onNew}>+ Nouvelle fiche</button>
    </div>
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"12px 16px",marginBottom:16,display:"flex",gap:10,flexWrap:"wrap"}}>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="🔍 Client, N° DE, lieu..." style={{...S.inp,flex:1,minWidth:160}}/>
      <select value={fs} onChange={e=>setFs(e.target.value)} style={{...S.sel,width:160}}>
        <option value="Tous">Tous statuts</option>
        {STATUTS_CHANTIER.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </div>
    {loading&&<div style={{textAlign:"center",padding:40,color:"#9CA3AF"}}>Chargement…</div>}
    {!loading&&clientList.length===0&&<div style={{textAlign:"center",padding:40,color:"#9CA3AF",background:"#fff",borderRadius:10,border:"1px solid #E2E6EA"}}>{fiches.length===0?"Aucune fiche — créez la première !":"Aucun résultat."}</div>}
    {clientList.map(c=><DossierClient key={c} client={c} fiches={parClient[c]} onOpen={onOpen} onApercu={onApercu} onDelete={onDelete} onStatutChange={onStatutChange} categories={categories} onDupliquer={onDupliquer}/>)}
  </div>);
}

function PageChoix({onChoisir,onRetour}){
  const mats=[{id:"Moteur",emoji:"⚙️",desc:"Moteur électrique seul"},{id:"Pompe",emoji:"💧",desc:"Corps de pompe + moteur"},{id:"Ventilation",emoji:"🌀",desc:"Ventilateur + moteur",soon:true},{id:"Réducteur",emoji:"🔩",desc:"Réducteur + moteur",soon:true},{id:"Moto-réducteur",emoji:"🔧",desc:"Moto-réducteur complet"}];
  return(<div style={{maxWidth:700,margin:"0 auto",padding:"20px 16px"}}><button style={{...S.p2,marginBottom:20}} onClick={onRetour}>← Retour</button><h2 style={{fontSize:20,fontWeight:800,margin:"0 0 6px"}}>Nouvelle fiche — quel matériel ?</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:14}}>{mats.map(m=><div key={m.id} onClick={()=>onChoisir(m.id)} style={{...S.card,textAlign:"center",cursor:m.soon?"default":"pointer",opacity:m.soon?0.6:1}}><div style={{fontSize:32,marginBottom:8}}>{m.emoji}</div><p style={{fontWeight:700,fontSize:15,margin:"0 0 4px"}}>{m.id}</p><p style={{fontSize:12,color:"#9CA3AF",margin:0}}>{m.desc}</p>{m.soon&&<p style={{fontSize:11,color:"#E8720C",margin:"6px 0 0"}}>Bientôt disponible</p>}</div>)}</div></div>);
}

// ─── RAPPORT CLIENT (moteur) ────────────────────────────────────────────
const VERDICT_OPTIONS=["Conforme","Non conforme","Autre"];
const RAPPORT_TEXT_KEYS=["mois_annee","adresse_chantier","contact","bordereau","descriptif_travaux","commentaire_vibration_avant","commentaire_roulements","commentaire_demontage","ensemble_libre","commentaire_apres","certifie_par","realise_par","date","adx_captures","sections"];
const RAPPORT_SECTIONS=[
  {key:"electrique",label:"Photo à l'arrivée + rapport électrique du bobinage"},
  {key:"avant",label:"Relevé électrique + vibration avant entretien"},
  {key:"mecanique",label:"Partie mécanique après extraction des roulements"},
  {key:"apres",label:"Essai mécanique + relevé après entretien"},
  {key:"conclusion",label:"Conclusion et signatures"},
];
const RAPPORT_VERDICT_KEYS=["verdict_arbre_av","verdict_flasque_av","verdict_arbre_ar","verdict_flasque_ar","verdict_bobinage","verdict_masse","verdict_meca","verdict_elec"];
const RAPPORT_PHOTO_SLOTS=[
  {key:"plaque_moteur",categorie:"Plaque moteur",label:"Plaque moteur (à l'arrivée)"},
  {key:"vue_ensemble",categorie:"Vue d'ensemble",label:"Moteur (vue d'ensemble à l'arrivée)"},
  {key:"skf_av_dem",categorie:"Screen SKF avant au démontage",label:"Vibration avant démontage — côté commande"},
  {key:"skf_ar_dem",categorie:"Screen SKF arrière au démontage",label:"Vibration avant démontage — côté opposé"},
  {key:"stator_av",categorie:"Stator avant",label:"Chignon (démontage)"},
  {key:"stator_ar",categorie:"Stator arrière",label:"Arrière (démontage)"},
  {key:"skf_av_rem",categorie:"Screen SKF avant au remontage",label:"Vibration après remontage — côté commande"},
  {key:"skf_ar_rem",categorie:"Screen SKF arrière au remontage",label:"Vibration après remontage — côté opposé"},
  {key:"apres",categorie:null,label:"Photo après entretien"},
];


function ChampVerdict({valeur,onChange}){
  const isAutre=(valeur||"").indexOf("Autre:")===0;
  return(<div style={{display:"flex",flexDirection:"column",gap:5}}>
    <select value={isAutre?"Autre":(valeur||"")} onChange={e=>{if(e.target.value==="Autre")onChange("Autre:");else onChange(e.target.value);}} style={S.sel}>
      <option value="">— Sélectionner</option>
      {VERDICT_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
    {isAutre&&<input type="text" placeholder="Préciser..." value={valeur.replace("Autre:","")} onChange={e=>onChange("Autre:"+e.target.value)} style={S.inp}/>}
  </div>);
}

function LigneVerdict({label,rk,data,upd}){
  return(<div style={{display:"grid",gridTemplateColumns:"1fr 200px",gap:10,alignItems:"start",marginBottom:10}}>
    <label style={{...S.lbl,marginTop:8}}>{label}</label>
    <ChampVerdict valeur={data[rk]||""} onChange={v=>upd(rk,v)}/>
  </div>);
}

function BlocPhotoRapport({slot,url,ficheId,uploading,onUpload}){
  const fr=useRef();
  return(<div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
    {url
      ?<img src={url} alt={slot.label} style={{width:110,height:80,objectFit:"cover",borderRadius:6,border:"1px solid #E2E6EA",cursor:"pointer"}} onClick={()=>window.open(url,"_blank")}/>
      :<div style={{width:110,height:80,borderRadius:6,border:"1.5px dashed #D1D5DB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#9CA3AF",textAlign:"center",padding:4}}>Non disponible</div>
    }
    <input ref={fr} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{if(e.target.files[0])onUpload(slot.key,e.target.files[0]);}}/>
    <button onClick={()=>fr.current.click()} disabled={!ficheId||uploading===slot.key} style={{...S.p2,fontSize:11,padding:"4px 10px",opacity:ficheId?1:0.5}}>{uploading===slot.key?"...":(url?"Remplacer":"Ajouter")}</button>
    <span style={{fontSize:10,color:"#6B7280",textAlign:"center"}}>{slot.label}</span>
  </div>);
}

function PageRapport({ficheId,techs,onRetour}){
  const [loading,setLoading]=useState(true);
  const [v,setV]=useState({});
  const [photos,setPhotos]=useState([]);
  const [data,setData]=useState({});
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [uploading,setUploading]=useState(null);
  const [exportingWord,setExportingWord]=useState(false);
  const captureFileRef=useRef();

  useEffect(()=>{
    if(!ficheId){setLoading(false);return;}
    setLoading(true);
    Promise.all([
      db.get("fiche_valeurs","?fiche_id=eq."+ficheId),
      db.get("fiche_photos","?fiche_id=eq."+ficheId+"&order=created_at"),
    ]).then(([valeurs,fotos])=>{
      const vv={};
      if(Array.isArray(valeurs))valeurs.forEach(r=>{vv[r.champ_id]=r.valeur;});
      setV(vv);
      if(Array.isArray(fotos))setPhotos(fotos.map(p=>({...p,url:db.photoUrl(p.storage_path)})));
      const d={};
      RAPPORT_TEXT_KEYS.forEach(k=>{if(vv["rapport_"+k]!==undefined)d[k]=vv["rapport_"+k];});
      RAPPORT_VERDICT_KEYS.forEach(k=>{if(vv["rapport_"+k]!==undefined)d[k]=vv["rapport_"+k];});
      RAPPORT_PHOTO_SLOTS.forEach(s=>{const k="photo_"+s.key+"_url";if(vv["rapport_"+k]!==undefined)d[k]=vv["rapport_"+k];});
      setData(d);
      setLoading(false);
    });
  },[ficheId]);

  const cheminBase=cheminFiche(v).chemin;

  function upd(k,val){setData(p=>({...p,[k]:val}));}

  function captures(){try{const a=JSON.parse(data.adx_captures||"[]");return Array.isArray(a)?a:[];}catch(e){return [];}}
  function setCaptures(arr){upd("adx_captures",JSON.stringify(arr));}

  function sectionsState(){try{const s=JSON.parse(data.sections||"{}");return s;}catch(e){return {};}}
  function sectionActive(key){const s=sectionsState();return s[key]!==false;}
  function toggleSection(key){const s=sectionsState();s[key]=!sectionActive(key);upd("sections",JSON.stringify(s));}

  const photosResolved={};
  RAPPORT_PHOTO_SLOTS.forEach(s=>{
    const auto=s.categorie?photos.find(p=>p.categorie_nom===s.categorie):null;
    photosResolved[s.key]=auto?auto.url:(data["photo_"+s.key+"_url"]||null);
  });

  async function uploadManuel(slotKey,file){
    if(!file||!ficheId)return;
    setUploading(slotKey);
    try{
      const ext=file.name.split(".").pop()||"jpg";
      const path=(cheminBase||"photos")+"/rapport_"+slotKey+"."+ext;
      await db.uploadPhoto(path,file);
      upd("photo_"+slotKey+"_url",db.photoUrl(path));
    }catch(e){alert("Erreur upload : "+e.message);}
    setUploading(null);
  }

  async function ajouterCapture(file){
    if(!file||!ficheId)return;
    setUploading("capture");
    try{
      const arr=captures();
      const ext=file.name.split(".").pop()||"jpg";
      const path=(cheminBase||"photos")+"/rapport_adx_"+(arr.length+1)+"."+ext;
      await db.uploadPhoto(path,file);
      setCaptures([...arr,{url:db.photoUrl(path),caption:""}]);
    }catch(e){alert("Erreur upload : "+e.message);}
    setUploading(null);
  }
  function majCaption(i,texte){const arr=captures();arr[i]={...arr[i],caption:texte};setCaptures(arr);}
  function supprimerCapture(i){setCaptures(captures().filter((_,j)=>j!==i));}

  async function enregistrer(){
    if(!ficheId)return;
    setSaving(true);
    try{
      const rows=Object.keys(data).filter(k=>data[k]!==undefined&&data[k]!=="").map(k=>({fiche_id:ficheId,champ_id:"rapport_"+k,valeur:String(data[k])}));
      if(rows.length>0)await db.upsert("fiche_valeurs",rows,"fiche_id,champ_id");
      setSaved(true);setTimeout(()=>setSaved(false),3000);
    }catch(e){alert("Erreur enregistrement : "+e.message);}
    setSaving(false);
  }

  function apercu(){
    apercuRapport(v,data,photosResolved);
  }

  async function exporterWord(){
    setExportingWord(true);
    try{
      await exporterRapportDocx(v,data,photosResolved,(v.de||"rapport"));
    }catch(e){alert("Erreur export Word : "+e.message);}
    setExportingWord(false);
  }

  const photosAuto=RAPPORT_PHOTO_SLOTS.filter(s=>s.categorie);
  const photoApres=RAPPORT_PHOTO_SLOTS.find(s=>s.key==="apres");
  const techsList=techs||[];

  if(loading)return <div style={{textAlign:"center",padding:60,color:"#9CA3AF"}}>Chargement…</div>;

  return(<div style={{maxWidth:820,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <h2 style={{fontSize:20,fontWeight:700,margin:0}}>📧 Rapport client — {v.client||"—"} / {v.de||"—"}</h2>
      <button style={S.p2} onClick={onRetour}>← Retour</button>
    </div>

    {!ficheId&&<div style={{...S.alert,marginBottom:14}}>⚠ Enregistrez au moins une étape de la fiche avant de remplir le rapport.</div>}
    {saved&&<div style={S.ok}>✅ Rapport enregistré.</div>}

    <div style={{...S.card,border:"1.5px solid #1B4F8A"}}>
      <p style={{fontSize:13,fontWeight:700,margin:"0 0 4px"}}>Sections à inclure dans ce rapport</p>
      <p style={{fontSize:11,color:"#9CA3AF",margin:"0 0 12px"}}>Informations chantier, sommaire et norme ISO sont toujours inclus. Décochez ce qui ne s'applique pas à cette intervention.</p>
      {RAPPORT_SECTIONS.map(s=>(
        <label key={s.key} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,marginBottom:6,cursor:"pointer"}}>
          <input type="checkbox" checked={sectionActive(s.key)} onChange={()=>toggleSection(s.key)}/>
          {s.label}
        </label>
      ))}
    </div>

    <div style={S.card}>
      <p style={{fontSize:13,fontWeight:700,margin:"0 0 10px"}}>Informations chantier (à remplir)</p>
      <div style={{marginBottom:10}}><label style={S.lbl}>Mois/année (page de garde)</label><input type="text" value={data.mois_annee||""} onChange={e=>upd("mois_annee",e.target.value)} placeholder="MM/AAAA" style={S.inp}/></div>
      <div style={{marginBottom:10}}><label style={S.lbl}>Adresse du chantier</label><input type="text" value={data.adresse_chantier||""} onChange={e=>upd("adresse_chantier",e.target.value)} style={S.inp}/></div>
      <div style={{marginBottom:10}}><label style={S.lbl}>Contact sur place</label><input type="text" value={data.contact||""} onChange={e=>upd("contact",e.target.value)} style={S.inp}/></div>
      <div style={{marginBottom:10}}><label style={S.lbl}>Bordereau d'expédition</label><input type="text" value={data.bordereau||""} onChange={e=>upd("bordereau",e.target.value)} style={S.inp}/></div>
      <div style={{marginBottom:0}}><label style={S.lbl}>Descriptif des travaux réalisés</label><textarea value={data.descriptif_travaux||""} onChange={e=>upd("descriptif_travaux",e.target.value)} style={{...S.inp,minHeight:60,resize:"vertical",fontFamily:"inherit"}}/></div>
    </div>

    <div style={S.card}>
      <p style={{fontSize:13,fontWeight:700,margin:"0 0 12px"}}>📷 Photos du rapport</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:16}}>
        {photosAuto.map(s=><BlocPhotoRapport key={s.key} slot={s} url={photosResolved[s.key]} ficheId={ficheId} uploading={uploading} onUpload={uploadManuel}/>)}
      </div>
      <p style={{fontSize:11,color:"#9CA3AF",margin:"10px 0 0"}}>Les photos déjà prises sur la fiche (catégories correspondantes) sont utilisées automatiquement. Sinon, ajoutez-les ici.</p>
    </div>

    <div style={S.card}>
      <p style={{fontSize:13,fontWeight:700,margin:"0 0 4px"}}>Rapport électrique — captures d'appareil (ADX, RLC, Hipot, Surge…)</p>
      <p style={{fontSize:11,color:"#9CA3AF",margin:"0 0 12px"}}>Ajoutez autant de captures que nécessaire, avec un court commentaire pour chacune.</p>
      {captures().map((c,i)=>(
        <div key={i} style={{display:"flex",gap:10,alignItems:"center",marginBottom:8,padding:"6px 8px",background:"#F8F9FA",borderRadius:8}}>
          <img src={c.url} alt="capture" style={{width:70,height:52,objectFit:"cover",borderRadius:6,border:"1px solid #E2E6EA",cursor:"pointer"}} onClick={()=>window.open(c.url,"_blank")}/>
          <input type="text" value={c.caption||""} onChange={e=>majCaption(i,e.target.value)} placeholder="Commentaire (optionnel)..." style={{...S.inp,flex:1}}/>
          <button onClick={()=>supprimerCapture(i)} style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:6,color:"#D73A49",padding:"6px 10px",cursor:"pointer"}}>✕</button>
        </div>
      ))}
      <input ref={captureFileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])ajouterCapture(e.target.files[0]);e.target.value="";}}/>
      <button onClick={()=>captureFileRef.current.click()} disabled={!ficheId||uploading==="capture"} style={{...S.p2,fontSize:12,padding:"6px 12px",opacity:ficheId?1:0.5}}>{uploading==="capture"?"...":"+ Ajouter une capture"}</button>
    </div>

    <div style={S.card}>
      <p style={{fontSize:13,fontWeight:700,margin:"0 0 12px"}}>Vibration et mesures mécaniques</p>
      <div style={{marginBottom:12}}><label style={S.lbl}>Commentaire — vibration avant démontage</label><textarea value={data.commentaire_vibration_avant||""} onChange={e=>upd("commentaire_vibration_avant",e.target.value)} placeholder="Ex : Le moteur vibre au-dessus de la norme..." style={{...S.inp,minHeight:50,resize:"vertical",fontFamily:"inherit"}}/></div>
      <LigneVerdict label={"Portée interne avant (arbre) : "+(v.mesure_arbre_av||"—")+" mm"} rk="verdict_arbre_av" data={data} upd={upd}/>
      <LigneVerdict label={"Portée extérieure avant (flasque) : "+(v.mesure_flasque_av||"—")+" mm"} rk="verdict_flasque_av" data={data} upd={upd}/>
      <LigneVerdict label={"Portée interne arrière (arbre) : "+(v.mesure_arbre_ar||"—")+" mm"} rk="verdict_arbre_ar" data={data} upd={upd}/>
      <LigneVerdict label={"Portée extérieure arrière (flasque) : "+(v.mesure_flasque_ar||"—")+" mm"} rk="verdict_flasque_ar" data={data} upd={upd}/>
      <div style={{marginTop:6,marginBottom:10}}><label style={S.lbl}>Commentaire — roulements</label><textarea value={data.commentaire_roulements||""} onChange={e=>upd("commentaire_roulements",e.target.value)} placeholder="Ex : La quantité de graisse est correcte, les roulements sont usés..." style={{...S.inp,minHeight:50,resize:"vertical",fontFamily:"inherit"}}/></div>
      <div style={{marginBottom:0}}><label style={S.lbl}>Légende — photos chignon/arrière</label><input type="text" value={data.commentaire_demontage||""} onChange={e=>upd("commentaire_demontage",e.target.value)} style={S.inp}/></div>
    </div>

    <div style={S.card}>
      <p style={{fontSize:13,fontWeight:700,margin:"0 0 12px"}}>Conformité — électrique</p>
      <LigneVerdict label="Isolement entre enroulements (bobinage)" rk="verdict_bobinage" data={data} upd={upd}/>
      <LigneVerdict label="Isolement à la masse" rk="verdict_masse" data={data} upd={upd}/>
      <div style={{marginBottom:0}}><label style={S.lbl}>L'ensemble est (essais en charge)</label><input type="text" value={data.ensemble_libre||""} onChange={e=>upd("ensemble_libre",e.target.value)} style={S.inp}/></div>
    </div>

    <div style={S.card}>
      <p style={{fontSize:13,fontWeight:700,margin:"0 0 12px"}}>Conclusion</p>
      <LigneVerdict label="Le moteur est … mécaniquement" rk="verdict_meca" data={data} upd={upd}/>
      <LigneVerdict label="Le moteur est … électriquement" rk="verdict_elec" data={data} upd={upd}/>
      <div style={{marginBottom:10}}><label style={S.lbl}>Commentaire final</label><input type="text" value={data.commentaire_apres||""} onChange={e=>upd("commentaire_apres",e.target.value)} placeholder="Ex : L'arbre est protégé et la boîte à bornes fermée." style={S.inp}/></div>
      <div style={{marginBottom:0}}><BlocPhotoRapport slot={photoApres} url={photosResolved.apres} ficheId={ficheId} uploading={uploading} onUpload={uploadManuel}/></div>
    </div>

    <div style={S.card}>
      <p style={{fontSize:13,fontWeight:700,margin:"0 0 12px"}}>Signatures</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
        <div><label style={S.lbl}>Certifié conforme par</label><select value={data.certifie_par||""} onChange={e=>upd("certifie_par",e.target.value)} style={S.sel}><option value="">— Sélectionner</option>{techsList.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        <div><label style={S.lbl}>Rapport réalisé par</label><select value={data.realise_par||""} onChange={e=>upd("realise_par",e.target.value)} style={S.sel}><option value="">— Sélectionner</option>{techsList.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
      </div>
      <div style={{marginBottom:0}}><label style={S.lbl}>Date du rapport</label><input type="date" value={data.date||""} onChange={e=>upd("date",e.target.value)} style={{...S.inp,maxWidth:200}}/></div>
    </div>

    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:30}}>
      <button style={S.p2} onClick={enregistrer} disabled={saving||!ficheId}>{saving?"💾 ...":"💾 Enregistrer le rapport"}</button>
      <button style={S.p1} onClick={apercu}>👁 Aperçu</button>
      <button style={{...S.p1,background:"#22863A"}} onClick={exporterWord} disabled={exportingWord}>{exportingWord?"⏳ ...":"📝 Exporter en Word"}</button>
    </div>
  </div>);
}

function PageRapportsListe({fiches,onOpen}){
  const [q,setQ]=useState("");
  const moteurFiches=fiches.filter(f=>(f.type_materiel||"Moteur")==="Moteur");
  const filtrees=moteurFiches.filter(f=>{
    const qq=q.toLowerCase();
    return !qq||(f.de||"").toLowerCase().includes(qq)||(f.client||"").toLowerCase().includes(qq)||(f.materiel||"").toLowerCase().includes(qq);
  });
  const parClient={};filtrees.forEach(f=>{const c=f.client||"Sans client";if(!parClient[c])parClient[c]=[];parClient[c].push(f);});
  const clientList=Object.keys(parClient).sort();
  return(<div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
    <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 4px"}}>📧 Rapports client</h1>
    <p style={{fontSize:13,color:"#6B7280",margin:"0 0 16px"}}>{moteurFiches.length} fiche{moteurFiches.length>1?"s":""} moteur · sélectionnez-en une pour créer ou modifier son rapport.</p>
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"12px 16px",marginBottom:16}}>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="🔍 Client, N° DE, lieu..." style={S.inp}/>
    </div>
    {clientList.length===0&&<div style={{textAlign:"center",padding:40,color:"#9CA3AF",background:"#fff",borderRadius:10,border:"1px solid #E2E6EA"}}>Aucune fiche moteur.</div>}
    {clientList.map(c=>(
      <div key={c} style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",marginBottom:8,padding:"12px 16px"}}>
        <p style={{fontWeight:700,fontSize:14,margin:"0 0 8px"}}>{c}</p>
        {parClient[c].map(f=>{const st=statutInfo(f.statut_chantier);return(
          <div key={f.id} onClick={()=>onOpen(f)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderRadius:6,cursor:"pointer",background:"#F8F9FA",marginBottom:6}}>
            <span style={{fontSize:13}}>{f.de} · {f.materiel||"—"}</span>
            <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:st.bg,color:st.color}}>{st.label}</span>
          </div>
        );})}
      </div>
    ))}
  </div>);
}

function PageFiche({ficheInit,typeMateriel,sessionTech,techs,clients,onAddClient,categories,onRetour,onFicheUpdated,ouvrirApercu,onClearApercu,onOpenRapport,seedValeurs,onSeedConsumed}){
  const isPompe=typeMateriel==="Pompe";
  const isReducteur=typeMateriel==="Moto-réducteur";
  const etapesActives=isPompe?ETAPES_POMPE:isReducteur?ETAPES_REDUCTEUR:ETAPES;
  const champsActifs=isPompe?CHAMPS_POMPE:isReducteur?CHAMPS_REDUCTEUR:CHAMPS;
  function draftSiCorrespond(){const d=loadDraft();if(!d)return null;return d.ficheId===(ficheInit?.id||null)?d:null;}
  const [ficheId,setFicheId]=useState(ficheInit?.id||null);const [v,setV]=useState(()=>{const d=draftSiCorrespond();if(d)return d.v;return {de:ficheInit?.de||"",date_entree:today(),...(!ficheInit?.id&&seedValeurs?seedValeurs:{})};});const [actif,setActif]=useState(()=>{const d=draftSiCorrespond();return d?d.actif:(ficheInit?.etape_active||0);});const [validees,setValidees]=useState(()=>{const d=draftSiCorrespond();return d?d.validees:(ficheInit?.etapes_validees||[]);});const [nrMap,setNrMap]=useState({});const [saving,setSaving]=useState(false);const [flash,setFlash]=useState(null);const [erreur,setErreur]=useState(null);const [apercu,setApercu]=useState(false);const [photos,setPhotos]=useState([]);const [statutChantier,setStatutChantier]=useState(()=>{const d=draftSiCorrespond();return d?d.statutChantier:(ficheInit?.statut_chantier||"A_demonter");});const [commentaires,setCommentaires]=useState("");const [piecesCommande,setPiecesCommande]=useState([]);const [savingComm,setSavingComm]=useState(false);

  useEffect(()=>{
    if(seedValeurs&&onSeedConsumed)onSeedConsumed();
  },[]);

  useEffect(()=>{
    if(ouvrirApercu&&ficheInit?.id){
      // Attendre que les données soient chargées puis ouvrir aperçu
      const t=setTimeout(()=>{setApercu(true);onClearApercu&&onClearApercu();},1200);
      return()=>clearTimeout(t);
    }
  },[ouvrirApercu]);
  useEffect(()=>{
    if(!ficheInit?.id)return;
    db.get("fiche_valeurs","?fiche_id=eq."+ficheInit.id).then(rows=>{if(!Array.isArray(rows))return;const m={};rows.forEach(r=>{m[r.champ_id]=r.valeur;});setV(p=>{const merge={...p,...m};const d=draftSiCorrespond();return d?{...merge,...d.v}:merge;});setCommentaires(m["__commentaires"]||"");});
    db.get("fiche_photos","?fiche_id=eq."+ficheInit.id+"&order=created_at").then(rows=>{if(!Array.isArray(rows))return;setPhotos(rows.map(p=>({...p,url:db.photoUrl(p.storage_path)})));});
    db.get("suivi_pieces","?fiche_id=eq."+ficheInit.id).then(rows=>{if(Array.isArray(rows))setPiecesCommande(rows);});
  },[ficheInit?.id]);
  useEffect(()=>{
    saveDraft({ficheId,typeMateriel,sessionTech,v,actif,validees,statutChantier});
  },[ficheId,typeMateriel,sessionTech,v,actif,validees,statutChantier]);

const autoSaveTimer=useRef(null);
const onChange=useCallback((id,val)=>setV(p=>{
  const n={...p,[id]:val};
  if(id==="rapport_reduction"||id==="vitesse_sortie"){
    const vm=parseFloat((p.vitesse||"").replace("Autre:",""));
    if(!isNaN(vm)&&vm>0){
      if(id==="rapport_reduction"){const r=parseFloat(val);if(!isNaN(r)&&r>0)n.vitesse_sortie=String(Math.round((vm/r)*10)/10);}
      else{const s=parseFloat(val);if(!isNaN(s)&&s>0)n.rapport_reduction=String(Math.round((vm/s)*100)/100);}
    }
  }
  return n;
}),[]);
  const onAutoSaveChamp=useCallback(async(champId,valeur)=>{
    if(!ficheId||!champId||valeur===undefined||valeur==="")return;
    try{await db.upsertChamp(ficheId,champId,valeur);}catch(e){}
  },[ficheId]);
  const onPhotoAdded=useCallback(p=>setPhotos(prev=>[...prev,p]),[]);

  async function changerStatut(newStatut){setStatutChantier(newStatut);if(ficheId){await db.patch("fiches","?id=eq."+ficheId,{statut_chantier:newStatut});if(onFicheUpdated)onFicheUpdated(ficheId,{statut_chantier:newStatut});}}

  async function sauvegarderComm(){
    if(!ficheId)return;setSavingComm(true);
    try{
      await db.del("fiche_valeurs","?fiche_id=eq."+ficheId+"&champ_id=in.(__commentaires)");
      if(commentaires)await db.post("fiche_valeurs",[{fiche_id:ficheId,champ_id:"__commentaires",valeur:commentaires}]);
    }catch(e){}
    setSavingComm(false);
  }

  async function savePartiel(idxEtape){
    if(saving)return;
    setSaving(true);setErreur(null);
    try{
      let fid=ficheId;
      if(!fid){
        const res=await db.post("fiches",{de:v.de,materiel:v.materiel_lieu||"Moteur",client:v.client||"",statut:"En cours",statut_chantier:statutChantier||"A_demonter",etape_active:idxEtape,etapes_validees:validees,type_materiel:typeMateriel||"Moteur"});
        fid=Array.isArray(res)?res[0]?.id:res?.id;
        if(!fid)throw new Error("Impossible de créer la fiche");
        setFicheId(fid);
      }else{
        await db.patch("fiches","?id=eq."+fid,{de:v.de,client:v.client||"",materiel:v.materiel_lieu||"Moteur",statut:"En cours"});
      }
      const champs=Object.keys(v).filter(k=>v[k]!==undefined&&v[k]!=="");
      if(champs.length>0){
        const rows=champs.map(k=>({fiche_id:fid,champ_id:k,valeur:String(v[k])}));
        for(let i=0;i<rows.length;i+=50){
          await db.upsert("fiche_valeurs",rows.slice(i,i+50),"fiche_id,champ_id");
        }
      }
      setFlash("saved_partiel");setTimeout(()=>setFlash(null),2000);
      if(fid)onFicheUpdated(fid,{de:v.de,client:v.client||"",materiel:v.materiel_lieu||"Moteur"});
      clearDraft();
    }catch(e){setErreur(e.message||"Erreur de sauvegarde");}
    setSaving(false);
  }
  async function save(idx){
    setSaving(true);setErreur(null);
    try{
      let fid=ficheId;const newVal=[...new Set([...validees,idx])];const toutFini=newVal.length===etapesActives.length;const newSC=toutFini&&statutChantier==="A_demonter"?"Devis":statutChantier;
      if(!fid){
        const res=await db.post("fiches",{de:v.de,materiel:v.materiel_lieu||"Moteur",client:v.client||"",statut:toutFini?"Terminée":"En cours",statut_chantier:newSC,etape_active:idx+1,etapes_validees:newVal,type_materiel:typeMateriel||"Moteur"});
        fid=Array.isArray(res)?res[0]?.id:res?.id;if(!fid)throw new Error("Impossible de créer la fiche");setFicheId(fid);
        for(const p of photos){if(!p.fiche_id)try{await db.post("fiche_photos",{fiche_id:fid,etape:p.etape,categorie_slug:p.categorie_slug,categorie_nom:p.categorie_nom,nom_fichier:p.nom_fichier,storage_path:p.storage_path});}catch(e){}}
      }else{await db.patch("fiches","?id=eq."+fid,{de:v.de,client:v.client||"",materiel:v.materiel_lieu||"Moteur",statut:toutFini?"Terminée":"En cours",statut_chantier:newSC,etape_active:Math.min(idx+1,etapesActives.length-1),etapes_validees:newVal});setStatutChantier(newSC);}
      await db.del("fiche_valeurs","?fiche_id=eq."+fid+"&champ_id=not.in.(__commentaires)");
      const vals=Object.entries(v).filter(([k,val])=>!k.startsWith("__")&&val!==undefined&&val!=="").map(([champ_id,valeur])=>({fiche_id:fid,champ_id,valeur:String(valeur)}));
      if(vals.length>0)await db.post("fiche_valeurs",vals);
      await db.post("fiche_historique",{fiche_id:fid,technicien:sessionTech,action:"Étape validée",etape:ETAPES[idx]});
      if(onFicheUpdated)onFicheUpdated(fid,{statut:toutFini?"Terminée":"En cours",statut_chantier:newSC});
      setValidees(newVal);if(idx+1<etapesActives.length)setActif(idx+1);setFlash(idx);setTimeout(()=>setFlash(null),3000);onFicheUpdated(fid,{de:v.de,client:v.client||"",materiel:v.materiel_lieu||"Moteur",statut_chantier:newSC});
      clearDraft();
    }catch(e){setErreur("Erreur : "+e.message);}finally{setSaving(false);}
  }

  const prog=Math.round((validees.length/etapesActives.length)*100);const chem=cheminFiche(v);const st=statutInfo(statutChantier);

  return(<div style={{maxWidth:800,margin:"0 auto",paddingBottom:40}}>
    {apercu&&<ApercuFiche v={v} photos={photos} statutChantier={statutChantier} commentaires={commentaires} pieces={piecesCommande} nrMap={nrMap} champsData={champsActifs} etapesData={etapesActives} onClose={()=>{setApercu(false);document.body.style.overflow="";}}/>}
    <div style={{background:"#1B4F8A",color:"#fff",padding:"10px 16px",position:"sticky",top:56,zIndex:90}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div><p style={{margin:0,fontSize:12,fontWeight:700}}>{v.de} · {v.client||"Client"} · {v.materiel_lieu||typeMateriel||"Moteur"}</p><p style={{margin:0,fontSize:10,opacity:0.7}}>📁 {chem.client}/{chem.de}/{chem.mat} · {typeMateriel||"Moteur"}</p></div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <select value={statutChantier} onChange={e=>changerStatut(e.target.value)} style={{padding:"3px 8px",borderRadius:20,border:"1.5px solid "+st.color,fontSize:11,fontWeight:600,color:st.color,background:st.bg,cursor:"pointer"}}>{STATUTS_CHANTIER.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
          <div style={{background:"rgba(255,255,255,0.2)",borderRadius:20,height:6,width:80}}><div style={{background:"#E8720C",height:6,borderRadius:20,width:prog+"%",transition:"width .4s"}}/></div>
          <span style={{fontSize:11,opacity:0.85}}>{prog}%</span>
          <button style={{...S.p2,fontSize:11,padding:"4px 10px"}} onClick={()=>{setApercu(true);document.body.style.overflow="hidden";}}>👁</button><button style={{...S.p2,fontSize:11,padding:"4px 10px",background:"#22863A",color:"#fff",border:"none"}} onClick={()=>imprimerFiche(v,photos,statutChantier,commentaires,piecesCommande,{},champsActifs,etapesActives)}>📄</button><button style={{...S.p2,fontSize:11,padding:"4px 10px"}} onClick={()=>{clearDraft();onRetour();}}>← Liste</button>
        </div>
      </div>
    </div>
    <div style={{padding:"16px 16px 0"}}>
      {flash==="saved_partiel"&&<div style={{...S.ok,background:"#EEF4FF",color:"#1B4F8A",border:"1px solid #D6E4F7"}}>💾 Données sauvegardées.</div>}{flash!==null&&flash!=="saved_partiel"&&<div style={S.ok}>✅ Étape "{etapesActives[flash]}" enregistrée.</div>}
      {erreur&&<div style={{...S.alert,marginBottom:14}}>{erreur}</div>}
      {etapesActives.map((nom,i)=><SectionEtape key={nom} nom={nom} idx={i} total={etapesActives.length} actif={actif} validees={validees} v={v} nr={!!nrMap[i]} onChange={onChange} onNR={()=>setNrMap(p=>({...p,[i]:!p[i]}))} onValider={()=>save(i)} onSauvegarder={()=>savePartiel(i)} onAutoSaveChamp={onAutoSaveChamp} sessionTech={sessionTech} techs={techs} clients={clients} onAddClient={onAddClient} saving={saving} ficheId={ficheId} cheminBase={chem.chemin} categories={categories} photos={photos} onPhotoAdded={onPhotoAdded} champsSource={champsActifs}/>)}

      <SectionMaterielCommander v={v} ficheId={ficheId} de={v.de} client={v.client||""} piecesInit={piecesCommande} onSave={setPiecesCommande} typeMateriel={typeMateriel}/>

      <div style={{...S.card,marginTop:8}}>
        <p style={{fontSize:13,fontWeight:700,margin:"0 0 10px"}}>💬 Commentaires divers</p>
        <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
          <textarea value={commentaires} onChange={e=>setCommentaires(e.target.value)} placeholder="Observations, remarques générales..." style={{...S.inp,minHeight:70,resize:"vertical",fontFamily:"inherit",flex:1}}/>
          <BoutonDictee onTexte={txt=>setCommentaires(appendTexte(commentaires,txt))}/>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
          <button onClick={sauvegarderComm} disabled={savingComm||!ficheId} style={{...S.p1,fontSize:12,padding:"6px 14px",opacity:ficheId?1:0.5}}>{savingComm?"…":"💾 Sauvegarder"}</button>
        </div>
      </div>

      <div style={{...S.card,border:"2px solid "+(validees.length===etapesActives.length?"#22863A":"#E2E6EA")}}>
        {validees.length===etapesActives.length&&<div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:32,marginBottom:6}}>🎉</div>
          <p style={{fontSize:16,fontWeight:800,color:"#22863A",margin:0}}>Fiche complète !</p>
        </div>}
        <p style={{fontSize:12,color:"#6B7280",margin:"0 0 10px"}}>📁 {chem.client} / {chem.de} / {chem.mat} · {photos.length} photo{photos.length>1?"s":""}</p>
        <div style={{marginBottom:12}}><SelecteurStatut statutId={statutChantier} onChange={changerStatut}/></div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button style={S.p1} onClick={()=>{setApercu(true);document.body.style.overflow="hidden";}}>👁 Aperçu fiche</button>
          <button style={{...S.p1,background:"#22863A"}} onClick={()=>imprimerFiche(v,photos,statutChantier,commentaires,piecesCommande,{},champsActifs,etapesActives)}>📄 Imprimer / PDF</button>
          {!isPompe&&<button style={{...S.p2,opacity:ficheId?1:0.5}} disabled={!ficheId} onClick={()=>onOpenRapport(ficheId)}>📧 Rapport client</button>}
          <button style={S.p2} onClick={onRetour}>← Retour à l'accueil</button>
        </div>
      </div>
    </div>
  </div>);
}


// ═══════════════════════════════════════════════════
// PAGE FICHE CHANTIER
// ═══════════════════════════════════════════════════

const ETAPES_CHANTIER = ["Informations","Travaux réalisés","Matériel utilisé","Observations"];

const CHAMPS_CHANTIER = {
  "Informations": [
    {id:"ch_date",label:"Date intervention",type:"date",required:true},
    {id:"ch_client",label:"Client",type:"client",required:true},
    {id:"ch_de",label:"N° DE",type:"text",required:true},
    {id:"ch_adresse",label:"Adresse / Site",type:"text",required:false},
    {id:"ch_contact",label:"Contact sur place",type:"text",required:false},
    {id:"ch_tel",label:"Téléphone contact",type:"text",required:false},
    {id:"ch_tech",label:"Technicien(s)",type:"technicien",required:true},
  ],
  "Travaux réalisés": [
    {id:"ch_type_travaux",label:"Type de travaux",type:"select",options:["Maintenance préventive","Maintenance corrective","Mise en service","Dépannage","Contrôle / Diagnostic","Remplacement","Installation","Autre"],required:true},
    {id:"ch_equipement",label:"Equipement concerné",type:"text",required:true},
    {id:"ch_description",label:"Description des travaux",type:"textarea",required:true},
    {id:"ch_duree",label:"Durée intervention (h)",type:"number",required:false},
    {id:"ch_comm_travaux",label:"Commentaire",type:"textarea",required:false},
  ],
  "Matériel utilisé": [
    {id:"ch_pieces",label:"Pièces remplacées / utilisées",type:"textarea",required:false},
    {id:"ch_ref_pieces",label:"Références pièces",type:"textarea",required:false},
    {id:"ch_comm_materiel",label:"Commentaire",type:"textarea",required:false},
  ],
  "Observations": [
    {id:"ch_etat_general",label:"Etat général",type:"select",options:["Bon","Moyen","Mauvais","A surveiller"],required:false},
    {id:"ch_anomalies",label:"Anomalies constatées",type:"textarea",required:false},
    {id:"ch_preconisations",label:"Préconisations",type:"textarea",required:false},
    {id:"ch_suite",label:"Suite à donner",type:"select",options:["Aucune","A planifier","Urgent","Devis nécessaire"],required:false},
    {id:"ch_comm_obs",label:"Commentaire",type:"textarea",required:false},
    {id:"ch_tech_fin",label:"Technicien clôture",type:"technicien",required:false},
  ],
};

function PageChantier({techs,clients,onAddClient,categories,sessionTech}){
  const [view,setView]=React.useState("liste");
  const [ficheOuverte,setFicheOuverte]=React.useState(null);
  const [fiches2,setFiches2]=React.useState([]);
  const [loading,setLoading]=React.useState(true);

  React.useEffect(function(){
    db.get("fiches_chantier","?order=created_at.desc").then(function(d){
      setFiches2(Array.isArray(d)?d:[]);
      setLoading(false);
    }).catch(function(){setLoading(false);});
  },[]);

  if(view==="fiche"){
    return(<FicheChantier
      fiche={ficheOuverte}
      techs={techs}
      clients={clients}
      onAddClient={onAddClient}
      categories={categories}
      sessionTech={sessionTech}
      onRetour={function(){setView("liste");}}
      onSaved={function(f){
        setFiches2(function(prev){
          var exists=prev.find(function(x){return x.id===f.id;});
          return exists?prev.map(function(x){return x.id===f.id?f:x;}):[f,...prev];
        });
        setFicheOuverte(f);
      }}
    />);
  }

  return(<div style={{padding:"0 0 80px"}}>
    <div style={{padding:"16px 16px 8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <h2 style={{fontSize:18,fontWeight:700,color:"#1B4F8A",margin:0}}>{"Fiches Chantier"}</h2>
      <button onClick={function(){setFicheOuverte(null);setView("fiche");}} style={{...S.p1,fontSize:13,padding:"8px 16px"}}>{"+ Nouvelle fiche"}</button>
    </div>
    {loading&&<div style={{textAlign:"center",padding:40,color:"#9CA3AF"}}>{"Chargement..."}</div>}
    {!loading&&fiches2.length===0&&<div style={{textAlign:"center",padding:40,color:"#9CA3AF"}}>{"Aucune fiche chantier"}</div>}
    {!loading&&fiches2.map(function(f){
      return(<div key={f.id} style={{...S.card,margin:"0 16px 10px",cursor:"pointer"}} onClick={function(){setFicheOuverte(f);setView("fiche");}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1B4F8A"}}>{f.de||"Sans N° DE"}</p>
            <p style={{margin:"2px 0 0",fontSize:12,color:"#6B7280"}}>{f.client||"Sans client"}</p>
            <p style={{margin:"2px 0 0",fontSize:11,color:"#9CA3AF"}}>{f.materiel||""}</p>
          </div>
          <span style={{fontSize:11,background:"#EEF4FF",color:"#1B4F8A",padding:"3px 8px",borderRadius:10,fontWeight:600}}>{f.statut||"En cours"}</span>
        </div>
      </div>);
    })}
  </div>);
}

function FicheChantier({fiche,techs,clients,onAddClient,categories,sessionTech,onRetour,onSaved}){
  var etapes=ETAPES_CHANTIER;
  var [ficheId,setFicheId]=React.useState(fiche?fiche.id:null);
  var vInit={ch_date:today()};
  var [v,setV]=React.useState(vInit);
  var [actif,setActif]=React.useState(0);
  var [validees,setValidees]=React.useState([]);
  var [saving,setSaving]=React.useState(false);
  var [photos,setPhotos]=React.useState([]);
  var [statutChantier,setStatutChantier]=React.useState("En cours");
  var [flash,setFlash]=React.useState(null);
  var [erreur,setErreur]=React.useState(null);

  React.useEffect(function(){
    if(!fiche||!fiche.id)return;
    db.get("fiches_chantier_valeurs","?fiche_id=eq."+fiche.id).then(function(rows){
      if(!Array.isArray(rows))return;
      var obj={};rows.forEach(function(r){obj[r.champ_id]=r.valeur;});
      setV(function(prev){return Object.assign({},prev,obj);});
    });
    db.get("fiches_chantier_photos","?fiche_id=eq."+fiche.id+"&order=created_at").then(function(p){
      if(Array.isArray(p))setPhotos(p.map(function(ph){return Object.assign({},ph,{url:db.photoUrl(ph.storage_path)});}));
    });
    if(fiche.statut)setStatutChantier(fiche.statut);
  },[fiche]);

  var onChange=React.useCallback(function(id,val){
    setV(function(p){var n=Object.assign({},p);n[id]=val;return n;});
  },[]);

  async function sauvegarder(idx2){
    if(saving)return;
    setSaving(true);setErreur(null);
    try{
      var fid=ficheId;
      if(!fid){
        var res=await db.post("fiches_chantier",{de:v.ch_de||"",client:v.ch_client||"",materiel:v.ch_equipement||"Chantier",statut:statutChantier});
        fid=Array.isArray(res)?res[0]&&res[0].id:res&&res.id;
        if(!fid)throw new Error("Impossible de creer la fiche");
        setFicheId(fid);
        onSaved(Object.assign({id:fid},v,{statut:statutChantier}));
      }else{
        await db.patch("fiches_chantier","?id=eq."+fid,{de:v.ch_de||"",client:v.ch_client||"",materiel:v.ch_equipement||"Chantier",statut:statutChantier});
      }
      var champs=Object.keys(v).filter(function(k){return v[k]!==undefined&&v[k]!=="";});
      if(champs.length>0){
        var rows=champs.map(function(k){return {fiche_id:fid,champ_id:k,valeur:String(v[k])};});
        await db.upsert("fiches_chantier_valeurs",rows,"fiche_id,champ_id");
      }
      if(idx2!==undefined){
        var nv=validees.slice();
        if(!nv.includes(idx2))nv.push(idx2);
        setValidees(nv);
        setActif(Math.min(idx2+1,etapes.length-1));
      }
      setFlash("ok");setTimeout(function(){setFlash(null);},2000);
    }catch(e){setErreur(e.message||"Erreur");}
    setSaving(false);
  }

  var prog=Math.round((validees.length/etapes.length)*100);
  var cheminBase=(v.ch_client||"client").replace(/[^a-z0-9]/gi,"_")+"/"+(v.ch_de||"de")+"/"+(v.ch_equipement||"chantier").replace(/[^a-z0-9]/gi,"_");

  return(<div style={{paddingBottom:80}}>
    <div style={{background:"#1B4F8A",color:"#fff",padding:"10px 16px",position:"sticky",top:56,zIndex:90}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div>
          <p style={{margin:0,fontSize:12,fontWeight:700}}>{(v.ch_client||"Client")+" / "+(v.ch_de||"DE")+" / "+(v.ch_equipement||"Chantier")}</p>
          <p style={{margin:0,fontSize:10,opacity:0.7}}>{"Fiche Chantier"}</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{background:"rgba(255,255,255,0.2)",borderRadius:20,height:6,width:80}}>
            <div style={{background:"#4ADE80",borderRadius:20,height:6,width:prog+"%",transition:"width 0.3s"}}/>
          </div>
          <span style={{fontSize:11,opacity:0.85}}>{prog+"%"}</span>
          <button style={{...S.p2,fontSize:11,padding:"4px 10px"}} onClick={onRetour}>{"Liste"}</button>
        </div>
      </div>
    </div>
    <div style={{padding:"16px 16px 0"}}>
      {flash==="ok"&&<div style={{...S.ok,marginBottom:12}}>{"Enregistré !"}</div>}
      {erreur&&<div style={{...S.alert,marginBottom:12}}>{erreur}</div>}
      {etapes.map(function(nom,i){
        var estAct=i===actif;
        var estVal=validees.includes(i);
        var estLock=i>actif&&!estVal;
        var champs=CHAMPS_CHANTIER[nom]||[];
        if(estLock)return(<div key={nom} style={{...S.cLock,marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px"}}>
            <span>{"🔒"}</span><span style={{fontSize:14,color:"#9CA3AF"}}>{(i+1)+". "+nom}</span>
          </div>
        </div>);
        return(<div key={nom} style={{...S.card,padding:0,border:"1.5px solid "+(estVal?"#22863A":estAct?"#1B4F8A":"#E2E6EA"),marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",cursor:"pointer",background:estVal?"#F0FFF4":estAct?"#fff":"#F8F9FA",borderRadius:"10px 10px 0 0"}} onClick={function(){setActif(i);}}>
            <span style={{fontSize:18}}>{estVal?"✅":estAct?"✏️":"○"}</span>
            <span style={{fontSize:14,fontWeight:700}}>{(i+1)+". "+nom}</span>
            <span style={{fontSize:13,color:"#9CA3AF",marginLeft:"auto"}}>{"▼"}</span>
          </div>
          {(estAct||estVal)&&<div style={{padding:"14px 16px"}}>
            {champs.map(function(c){
              var val=v[c.id]||"";
              var ctrl=null;
              if(c.type==="date")ctrl=<input type="date" value={val} onChange={function(e){onChange(c.id,e.target.value);}} style={S.inp}/>;
              else if(c.type==="select")ctrl=(<select value={val} onChange={function(e){onChange(c.id,e.target.value);}} style={S.sel}>
                <option value="">{"Sélectionner"}</option>
                {c.options.map(function(o){return <option key={o} value={o}>{o}</option>;})}
              </select>);
              else if(c.type==="textarea")ctrl=(<div style={{display:"flex",gap:6,alignItems:"flex-start"}}><textarea value={val} onChange={function(e){onChange(c.id,e.target.value);}} style={{...S.inp,height:80,resize:"vertical",flex:1}}/><BoutonDictee onTexte={function(txt){onChange(c.id,appendTexte(val,txt));}}/></div>);
              else if(c.type==="technicien")ctrl=<ChampTechnicien valeur={val} onChange={function(nv){onChange(c.id,nv);}} techs={techs}/>;
              else if(c.type==="client")ctrl=<ChampClient valeur={val} onChange={function(nv){onChange(c.id,nv);}} clients={clients} onAddClient={onAddClient}/>;
              else ctrl=<input type="text" value={val} onChange={function(e){onChange(c.id,e.target.value);}} style={S.inp}/>;
              return(<div key={c.id} style={{marginBottom:12}}>
                <label style={{fontSize:11,fontWeight:600,color:"#6B7280",display:"block",marginBottom:4}}>{c.label}{c.required?" *":""}</label>
                {ctrl}
              </div>);
            })}
            <SectionPhotos ficheId={ficheId} cheminBase={cheminBase} etape={nom} categories={categories} photos={photos} onPhotoAdded={function(p){setPhotos(function(prev){return prev.concat([p]);});}} tablePhotos="fiches_chantier_photos"/>
            <div style={{display:"flex",gap:8,marginTop:14}}>
              <button onClick={function(){sauvegarder(undefined);}} disabled={saving} style={{...S.p2,fontSize:13,padding:"9px 16px",flexShrink:0}}>{saving?"...":"Enregistrer"}</button>
              <button onClick={function(){sauvegarder(i);}} disabled={saving} style={{...S.p1,fontSize:13,padding:"9px 16px",flex:1,justifyContent:"center"}}>{saving?"...":"Valider et continuer"}</button>
            </div>
          </div>}
        </div>);
      })}
    </div>
  </div>);
}


// Exposer les définitions pour pdfUtils
if(typeof window!=="undefined"){
  window.__CHAMPS=CHAMPS;
  window.__CHAMPS_POMPE=CHAMPS_POMPE;
  window.__ETAPES=ETAPES;
  window.__ETAPES_POMPE=ETAPES_POMPE;
}

// ─── SUIVI DE COMMANDES FOURNISSEURS (module indépendant, localStorage) ──
const COMMANDES_KEY="pmv_commandes_fournisseurs";
const MODELES_KEY="pmv_commandes_modeles";
const SIGNATURE_RELANCE=`PERROCHE Thibaud
agence@pmvservices.fr
Tel : 09.67.37.27.24

Sarl PMV Services
Site d'activités de la choisille
7 rue des entrepreneurs
37390 La Membrolle sur Choisille

http://www.pmvservices.fr/

Ventes et réparations de moteurs électriques, ventilation, motoréducteurs, pompes et variateurs
Adoptez l'éco-attitude : n'imprimez cet e-mail que si nécessaire

Notre nouvel engagement pour toujours plus de qualité :
Respecter la norme 60034-1 , Norme dédiée à la réparation des machines électrique tournantes, respect des caractéristiques assignées et de fonctionnement.
Et toujours : un grand stock de moteur ABB, (B3. B5, B35 et B14 en 4 et 2 pôles) disponible en atelier de 0.37 kW à 37 kW`;
const MODELE_DELAI_DEPASSE_DEFAUT=`Ref Chantier : {chantier}

Bonjour
Sauf erreur de notre part, nous sommes toujours en attente de votre commande n° {commande}, initialement prévue le {delai}.

Je reste à votre disposition pour tous compléments d'informations
Cordialement`;
const MODELE_PAS_DE_DELAI_DEFAUT=`Ref Chantier : {chantier}

Bonjour
Sauf erreur de notre part, nous n'avons pas encore reçu de délai de livraison pour notre commande n° {commande} ({fournitures}), passée le {dateCommande}. Pourriez-vous nous communiquer une date prévisionnelle ?

Je reste à votre disposition pour tous compléments d'informations
Cordialement`;

function chargerCommandes(){try{return JSON.parse(localStorage.getItem(COMMANDES_KEY)||"[]");}catch(e){return[];}}
function sauverCommandes(arr){try{localStorage.setItem(COMMANDES_KEY,JSON.stringify(arr));}catch(e){}}
function chargerModeles(){
  try{
    const s=JSON.parse(localStorage.getItem(MODELES_KEY)||"null");
    if(s&&s.delaiDepasse&&s.pasDeDelai)return s;
  }catch(e){}
  return {delaiDepasse:MODELE_DELAI_DEPASSE_DEFAUT,pasDeDelai:MODELE_PAS_DE_DELAI_DEFAUT};
}
function sauverModeles(obj){try{localStorage.setItem(MODELES_KEY,JSON.stringify(obj));}catch(e){}}

// ── Suivi des commandes fournisseurs : stockage partagé (Supabase), visible sur tous les appareils ──
async function chargerModelesCloud(){
  try{
    const rows=await db.get("commandes_modeles","?id=eq.default");
    if(Array.isArray(rows)&&rows[0]&&rows[0].delai_depasse&&rows[0].pas_de_delai){
      return {delaiDepasse:rows[0].delai_depasse,pasDeDelai:rows[0].pas_de_delai};
    }
  }catch(e){}
  return {delaiDepasse:MODELE_DELAI_DEPASSE_DEFAUT,pasDeDelai:MODELE_PAS_DE_DELAI_DEFAUT};
}
async function sauverModelesCloud(obj){
  try{await db.upsert("commandes_modeles",{id:"default",delai_depasse:obj.delaiDepasse,pas_de_delai:obj.pasDeDelai},"id");}catch(e){}
}
async function chargerFournisseursCloud(){
  try{
    const rows=await db.get("fournisseurs_commandes","?order=nom");
    if(Array.isArray(rows)&&rows.length)return rows.map(r=>r.nom);
  }catch(e){}
  return [];
}
async function ajouterFournisseurCloud(nom){
  try{await db.post("fournisseurs_commandes",{nom});}catch(e){}
}

function commandeToRow(c){
  return {
    id:c.id,
    fournisseur:c.fournisseur||"",
    numero_commande:c.numeroCommande||"",
    numero_chantier:c.numeroChantier||"",
    type_commande:c.typeCommande||"Fourniture seule",
    type_fournitures:c.typeFournitures||"",
    montant_ht:c.montantHT||"",
    date_commande:c.dateCommande||"",
    delai_livraison:c.delaiLivraison||"",
    livraison_client:c.livraisonClient||"Non",
    recue:!!c.recue,
    date_reception:c.dateReception||"",
    ar_url:c.arUrl||null,
    nom_fichier_source:c.nomFichierSource||"",
    brouillon:!!c.brouillon,
    pieces:c.pieces||[],
  };
}
function rowToCommande(r){
  return {
    id:r.id,
    fournisseur:r.fournisseur||"",
    numeroCommande:r.numero_commande||"",
    numeroChantier:r.numero_chantier||"",
    typeCommande:r.type_commande||"Fourniture seule",
    typeFournitures:r.type_fournitures||"",
    montantHT:r.montant_ht||"",
    dateCommande:r.date_commande||"",
    delaiLivraison:r.delai_livraison||"",
    livraisonClient:r.livraison_client||"Non",
    recue:!!r.recue,
    dateReception:r.date_reception||"",
    arUrl:r.ar_url||null,
    hasAR:!!r.ar_url,
    nomFichierSource:r.nom_fichier_source||"",
    brouillon:!!r.brouillon,
    pieces:Array.isArray(r.pieces)?r.pieces:[],
  };
}
async function chargerCommandesCloud(){
  try{
    const rows=await db.get("commandes_fournisseurs","?order=created_at.desc");
    if(Array.isArray(rows))return rows.map(rowToCommande);
  }catch(e){}
  return [];
}
function pathDeUrlPhoto(url){return (url||"").replace(SUPA_URL+"/storage/v1/object/public/photos/","");}

const MIGRATION_CLOUD_FLAG_KEY="pmv_commandes_migre_cloud";
function migrationCommandesDisponible(){
  try{
    if(localStorage.getItem(MIGRATION_CLOUD_FLAG_KEY)==="1")return false;
    const legacy=JSON.parse(localStorage.getItem(COMMANDES_KEY)||"[]");
    return Array.isArray(legacy)&&legacy.length>0;
  }catch(e){return false;}
}

function fmtDateFr(iso){if(!iso)return "—";const d=new Date(iso+"T00:00:00");if(isNaN(d.getTime()))return "—";return d.toLocaleDateString("fr-FR");}
function fmtMontant(v){const n=parseFloat(v);if(isNaN(n))return "";return n.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" € HT";}

function statutCommande(cmd){
  if(cmd.recue)return{id:"recue",label:"Reçue",color:"#9CA3AF",bg:"#F5F6F8"};
  const t=new Date();t.setHours(0,0,0,0);
  if(cmd.delaiLivraison){
    const delai=new Date(cmd.delaiLivraison+"T00:00:00");delai.setHours(0,0,0,0);
    const diff=Math.round((t-delai)/86400000);
    if(diff>3)return{id:"retard_fort",label:"Retard "+diff+"j",color:"#D73A49",bg:"#FFF5F5"};
    if(diff>=1)return{id:"retard_leger",label:"Retard "+diff+"j",color:"#CA8A04",bg:"#FFFBEB"};
    return{id:"ok",label:"Dans les temps",color:"#22863A",bg:"#F0FFF4"};
  }else{
    const cmdDate=new Date((cmd.dateCommande||today())+"T00:00:00");cmdDate.setHours(0,0,0,0);
    const diff=Math.round((t-cmdDate)/86400000);
    if(diff>=7)return{id:"sans_delai_urgent",label:"Sans délai ("+diff+"j)",color:"#D73A49",bg:"#FFF5F5"};
    return{id:"sans_delai",label:"En attente de délai",color:"#22863A",bg:"#F0FFF4"};
  }
}

function trierCommandes(liste){
  return [...liste].sort((a,b)=>{
    if(a.delaiLivraison&&b.delaiLivraison)return a.delaiLivraison.localeCompare(b.delaiLivraison);
    if(a.delaiLivraison&&!b.delaiLivraison)return -1;
    if(!a.delaiLivraison&&b.delaiLivraison)return 1;
    return (a.dateCommande||"").localeCompare(b.dateCommande||"");
  });
}

function remplacerJetons(modele,cmd){
  return (modele||"")
    .split("{fournisseur}").join(cmd.fournisseur||"")
    .split("{commande}").join(cmd.numeroCommande||"")
    .split("{chantier}").join(cmd.numeroChantier||"")
    .split("{fournitures}").join(cmd.typeFournitures||"")
    .split("{delai}").join(fmtDateFr(cmd.delaiLivraison))
    .split("{dateCommande}").join(fmtDateFr(cmd.dateCommande));
}

async function copierTexte(texte){
  try{
    await navigator.clipboard.writeText(texte);
    return true;
  }catch(e){
    try{
      const ta=document.createElement("textarea");
      ta.value=texte;ta.style.position="fixed";ta.style.opacity="0";
      document.body.appendChild(ta);ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    }catch(e2){return false;}
  }
}

// AR de commande + pièces jointes (PDF/images) : stockés en IndexedDB (localStorage n'a que ~5-10 Mo, insuffisant pour des fichiers)
const AR_DB_NAME="pmv_commandes_ar_db";
const AR_STORE="ar_pdfs";
const PIECES_STORE="pieces_jointes";
function ouvrirArDb(){
  return new Promise((resolve,reject)=>{
    if(!window.indexedDB){reject(new Error("IndexedDB indisponible"));return;}
    const req=indexedDB.open(AR_DB_NAME,2);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(AR_STORE))db.createObjectStore(AR_STORE);
      if(!db.objectStoreNames.contains(PIECES_STORE))db.createObjectStore(PIECES_STORE);
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function sauverPieceJointe(id,file){
  const db=await ouvrirArDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(PIECES_STORE,"readwrite");
    tx.objectStore(PIECES_STORE).put(file,id);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
async function chargerPieceJointe(id){
  const db=await ouvrirArDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(PIECES_STORE,"readonly");
    const req=tx.objectStore(PIECES_STORE).get(id);
    req.onsuccess=()=>resolve(req.result||null);
    req.onerror=()=>reject(req.error);
  });
}
async function supprimerPieceJointe(id){
  const db=await ouvrirArDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(PIECES_STORE,"readwrite");
    tx.objectStore(PIECES_STORE).delete(id);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
async function sauverArPdf(id,file){
  const db=await ouvrirArDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(AR_STORE,"readwrite");
    tx.objectStore(AR_STORE).put(file,id);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
async function chargerArPdf(id){
  const db=await ouvrirArDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(AR_STORE,"readonly");
    const req=tx.objectStore(AR_STORE).get(id);
    req.onsuccess=()=>resolve(req.result||null);
    req.onerror=()=>reject(req.error);
  });
}
async function supprimerArPdf(id){
  const db=await ouvrirArDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(AR_STORE,"readwrite");
    tx.objectStore(AR_STORE).delete(id);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}

// Surveillance du dossier "Commandes" (File System Access API, Chrome/Edge) : le FileSystemDirectoryHandle
// est structured-cloneable et se stocke tel quel en IndexedDB pour être réutilisé d'une session à l'autre.
const DOSSIER_DB_NAME="pmv_commandes_dossier_db";
const DOSSIER_STORE="handles";
function ouvrirDossierDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DOSSIER_DB_NAME,1);
    req.onupgradeneeded=()=>{req.result.createObjectStore(DOSSIER_STORE);};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function sauverDossierHandle(handle){
  const db=await ouvrirDossierDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(DOSSIER_STORE,"readwrite");
    tx.objectStore(DOSSIER_STORE).put(handle,"commandes");
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
async function chargerDossierHandle(){
  try{
    const db=await ouvrirDossierDb();
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(DOSSIER_STORE,"readonly");
      const req=tx.objectStore(DOSSIER_STORE).get("commandes");
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error);
    });
  }catch(e){return null;}
}

const FICHIERS_VUS_KEY="pmv_commandes_fichiers_vus";
function chargerFichiersVus(){try{const a=JSON.parse(localStorage.getItem(FICHIERS_VUS_KEY)||"[]");return Array.isArray(a)?a:[];}catch(e){return[];}}
function sauverFichiersVus(set){try{localStorage.setItem(FICHIERS_VUS_KEY,JSON.stringify(Array.from(set).slice(-500)));}catch(e){}}

const JOURNAL_WATCHER_KEY="pmv_commandes_journal_watcher";
function chargerJournalWatcher(){try{const a=JSON.parse(localStorage.getItem(JOURNAL_WATCHER_KEY)||"[]");return Array.isArray(a)?a:[];}catch(e){return[];}}
function sauverJournalWatcher(arr){try{localStorage.setItem(JOURNAL_WATCHER_KEY,JSON.stringify(arr.slice(0,20)));}catch(e){}}

// Lecture automatique des AR de commande (PDF EBP) : extrait fournisseur/chantier/commande/date/fournitures
// pdfjs-dist est chargé à la demande (chunk séparé) pour ne pas alourdir le bundle principal
let _pdfjsLibPromise=null;
function chargerPdfjs(){
  if(!_pdfjsLibPromise){
    _pdfjsLibPromise=Promise.all([
      import(/* webpackChunkName: "pdfjs" */ "pdfjs-dist/legacy/build/pdf"),
      import(/* webpackChunkName: "pdfjs" */ "pdfjs-dist/legacy/build/pdf.worker.entry")
    ]).then(([lib,worker])=>{
      lib.GlobalWorkerOptions.workerSrc=worker.default;
      return lib;
    });
  }
  return _pdfjsLibPromise;
}
async function extraireLignesPdf(file){
  const pdfjsLib=await chargerPdfjs();
  const buf=await file.arrayBuffer();
  const doc=await pdfjsLib.getDocument({data:buf}).promise;
  let lignes=[];
  for(let p=1;p<=doc.numPages;p++){
    const page=await doc.getPage(p);
    const content=await page.getTextContent();
    content.items.forEach(it=>{if(it.str&&it.str.trim())lignes.push(it.str.trim());});
  }
  return lignes;
}
function nettoyerNomFournisseur(ligne){
  const prefixes=[
    "société par actions simplifiée unipersonnelle","société par actions simplifiée","société par actions simpl",
    "société à responsabilité limitée","société anonyme","entreprise individuelle à responsabilité limitée",
    "entreprise individuelle",
    "sasu","sas","sarl","eurl","eirl","sci","snc","sa"
  ];
  let l=(ligne||"").trim();
  const low=l.toLowerCase();
  for(const p of prefixes){
    if(low===p)return "";
    if(low.startsWith(p+" "))return l.slice(p.length).trim();
  }
  return l;
}
function analyserArPdf(lignesBrutes){
  const lignes=lignesBrutes.map(s=>s.trim()).filter(Boolean);
  const texte=lignes.join(" ~ ");
  const res={fournisseur:"",numeroChantier:"",numeroCommande:"",dateCommande:"",typeFournitures:"",montantHT:""};

  const mChantier=texte.match(/N°\s*DE\s*(\d{2,7})/i);
  if(mChantier)res.numeroChantier="DE"+mChantier[1];

  const mCommande=texte.match(/offre de prix\s*N°\s*([A-Za-z0-9]{3,15})/i);
  if(mCommande)res.numeroCommande=mCommande[1].toUpperCase();

  const mDate=texte.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if(mDate)res.dateCommande=mDate[3]+"-"+mDate[2]+"-"+mDate[1];

  const idxSiret=lignes.findIndex(l=>/siret\s*:/i.test(l));
  if(idxSiret>=0){
    const bloc=[];
    for(let i=idxSiret+1;i<lignes.length&&bloc.length<5;i++){
      bloc.push(lignes[i]);
      if(/^\d{5}\s/.test(lignes[i]))break;
    }
    if(bloc.length)res.fournisseur=nettoyerNomFournisseur(bloc[0]);
  }

  const idxOffrePrix=lignes.findIndex(l=>/offre de prix/i.test(l));
  if(idxOffrePrix>=0){
    let montantTotal=0,montantTrouve=false;
    let i=idxOffrePrix+1;
    while(i<lignes.length){
      const l=lignes[i];
      if(/^(txt\d+|taux|base ht|montant tva)/i.test(l))break;
      if(/^[\d.,\s]+€?$/.test(l)){
        // groupe Qté / P.A. HT / Montant HT / TVA% : on prend la 3e valeur (Montant HT de la ligne)
        const groupe=[];
        while(i<lignes.length&&/^[\d.,\s]+€?$/.test(lignes[i])&&groupe.length<4){groupe.push(lignes[i]);i++;}
        if(groupe.length>=3){
          const m=parseFloat(groupe[2].replace(/[€\s]/g,"").replace(",","."));
          if(!isNaN(m)){montantTotal+=m;montantTrouve=true;}
        }
      }else{
        if(!res.typeFournitures&&/[a-zA-ZÀ-ÿ]/.test(l))res.typeFournitures=l;
        i++;
      }
    }
    if(montantTrouve)res.montantHT=String(Math.round(montantTotal*100)/100);
  }
  return res;
}

// Détection de doublon : une commande avec le même n° (fournisseur) existe déjà dans le suivi
function trouverDoublon(numeroCommande,commandes){
  if(!numeroCommande||!numeroCommande.trim())return null;
  const n=numeroCommande.trim().toLowerCase();
  return commandes.find(c=>c.numeroCommande&&c.numeroCommande.trim().toLowerCase()===n)||null;
}

// Écart entre la date de réception réelle et le délai annoncé par le fournisseur
function ecartReception(c){
  if(!c.dateReception||!c.delaiLivraison)return "";
  const recu=new Date(c.dateReception+"T00:00:00");
  const prevu=new Date(c.delaiLivraison+"T00:00:00");
  const diff=Math.round((recu-prevu)/86400000);
  if(diff>0)return "⚠ "+diff+"j de retard";
  if(diff<0)return "🎉 "+(-diff)+"j d'avance";
  return "✅ à temps";
}

// Résumé pour le badge de nav : commandes actives à surveiller (retard/sans délai) + brouillons à compléter
function calculerResumeCommandes(commandes){
  const actives=commandes.filter(c=>!c.brouillon&&!c.recue);
  const brouillons=commandes.filter(c=>c.brouillon);
  let retard=0;
  actives.forEach(c=>{
    const id=statutCommande(c).id;
    if(id==="retard_fort"||id==="retard_leger"||id==="sans_delai_urgent")retard++;
  });
  return {retard,aCompleter:brouillons.length};
}

const TYPES_COMMANDE=["Fourniture seule","Atelier","Intervention"];

// Liste des fournisseurs : seedée depuis "Liste fournisseurs.xls", puis enrichie/persistée en local (module indépendant, pas de table Supabase)
const FOURNISSEURS_KEY="pmv_commandes_fournisseurs_liste";
const FOURNISSEURS_INITIAUX=["ABB Division Discrete automation&Motion","ABE","BERTHAULT","AGECOM","DORISE SAS","CITT Informatique de gestion","THERMALU ENTREPRISE SCOP ARL","LE BOBINAGE SABOLIEN BMP Groupe","FLUKE France","MCM LEVAGE","Pleuger Industries","JET","John Crane France SAS","HEINE Resistors GmbH","SECMO","EUROPE QUALITE LOIRE ATALANTIQUE","SONEL","KSB","ART BATI 68","SUEZ RV CENTRE OUEST","WILO FRANCE","FITEX","OUEST ISOL & VENTIL","ELECTRO-TOURS","ACTHYS","BECOT SAS","SULZER ENSIVAL MORET FRANCE","EMILE MAURIN","ATELIER BOBINAGE BLESOIS ETS PINSON","BERNER INDUSTRY SERVICES","REXEL","NORD REDUCTEURS","GOODIES LOIRE VALLEY","MABEO INDUSTRIES","EUROPE QUALITE","DEMOUSSIS INDUSTRIE","QUINCAILLERIE SETIN","CEF - YESSS ELECTRIQUE","TTA - TTA LUBRIFIANTS","SEBA MOTORISATION","PERRON ET GAY","COMMERCIAL OPS","IMI HYDRONIC ENGINEERING FRANCE","SCHUNK CARBON TECHNOLOGY","VIM","MARTIN HEULIN PROLIANS","TAPIS LOGO PRO","3KATORZE","METAL SPES","BAMO","IBERISA","ASTRA POOL","LECHEVALIER","DEMS","CIMAP","FLOWSERVE FRANCE","VIP VERNIS INDUSTRIE PEINTURES","SOFINTHER","LM SYSTEMES","AIR PN","EBARA FRANCE","SOCIETE D'EXPLOITATION DES ANCIENS ETABLISSEMENTS BRANGER","PCM EUROPE","MOTEURS - VENTILATEURS - INDUSTRIE","ENERFLUID SAS","SOTRELI","L'UNIFORM PRO","SCERAM","CIRCOR IMO ALLWEILER","F2A","LHUILLIER","CSI","MICHIGAN","ETS MEUNIER","SPECK POMPES INDUSTRIES","ATLAS COPCO COMPRESSEURS INDUSTRIELS","FRANS BONHOMME","SUMITOMO","2L INFOSERVICES","SNT","WURTH FRANCE","DELTA SERVICE LOCATION","FRANCE AIR","PROMAC","DYMATEC INDUSTRIES","ABAC - MULTIAIR FRANCE","APA 37","ManoMano","RUBIX","SEFI","WEG France"];
function chargerFournisseurs(){
  try{
    const s=JSON.parse(localStorage.getItem(FOURNISSEURS_KEY)||"null");
    if(Array.isArray(s)&&s.length)return s;
  }catch(e){}
  const initiaux=[...FOURNISSEURS_INITIAUX].sort((a,b)=>a.localeCompare(b));
  try{localStorage.setItem(FOURNISSEURS_KEY,JSON.stringify(initiaux));}catch(e){}
  return initiaux;
}
function sauverFournisseurs(arr){try{localStorage.setItem(FOURNISSEURS_KEY,JSON.stringify(arr));}catch(e){}}

function ChampFournisseur({valeur,onChange,fournisseurs,onAddFournisseur}){
  const [q,setQ]=useState(valeur||"");const [ouvert,setOuvert]=useState(false);const [modeAutre,setModeAutre]=useState(false);const ref=useRef(null);
  useEffect(()=>{function close(e){if(ref.current&&!ref.current.contains(e.target))setOuvert(false);}document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close);},[]);
  const filtres=q.length>0?fournisseurs.filter(f=>f.toLowerCase().includes(q.toLowerCase())):fournisseurs.slice(0,8);
  function select(f){if(f==="Autre"){setModeAutre(true);setQ("");onChange("");}else{setQ(f);onChange(f);setOuvert(false);setModeAutre(false);}}
  function enregistrer(){if(!q.trim())return;onAddFournisseur(q.trim());onChange(q.trim());setModeAutre(false);setOuvert(false);}
  if(modeAutre)return(<div><div style={{display:"flex",gap:8}}><input type="text" value={q} onChange={e=>{setQ(e.target.value);onChange(e.target.value);}} placeholder="Nom du fournisseur..." style={{...S.inp,flex:1}}/><button type="button" onClick={enregistrer} style={{...S.p1,fontSize:12,padding:"6px 12px",whiteSpace:"nowrap"}}>+ Enregistrer</button><button type="button" onClick={()=>{setModeAutre(false);setQ("");}} style={{...S.p2,fontSize:12,padding:"6px 10px"}}>✕</button></div></div>);
  return(<div ref={ref} style={{position:"relative"}}>
    <input type="text" value={q} onChange={e=>{setQ(e.target.value);setOuvert(true);onChange(e.target.value);}} onFocus={()=>setOuvert(true)} placeholder="Tapez pour rechercher..." style={S.inp}/>
    {ouvert&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1.5px solid #D1D5DB",borderRadius:6,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:50,maxHeight:200,overflowY:"auto"}}>
      {filtres.map(f=><div key={f} onClick={()=>select(f)} style={{padding:"7px 12px",cursor:"pointer",fontSize:13,borderBottom:"1px solid #F3F4F6"}} onMouseOver={e=>e.currentTarget.style.background="#F5F6F8"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>{f}</div>)}
      <div onClick={()=>select("Autre")} style={{padding:"7px 12px",cursor:"pointer",fontSize:13,color:"#E8720C",fontWeight:600,borderTop:"1px solid #E2E6EA"}}>+ Autre (nouveau fournisseur)</div>
    </div>}
  </div>);
}

function ModalCommande({initial,initialArFile,isEdit,commandes,fournisseurs,onAddFournisseur,onSave,onClose}){
  const [v,setV]=useState(initial||{
    fournisseur:"",numeroCommande:"",numeroChantier:"",typeCommande:"Fourniture seule",
    typeFournitures:"",montantHT:"",dateCommande:today(),delaiLivraison:"",livraisonClient:"Non",recue:false
  });
  const [arFile,setArFile]=useState(initialArFile||null);
  const [removeAr,setRemoveAr]=useState(false);
  const doublon=!isEdit?trouverDoublon(v.numeroCommande,commandes||[]):null;
  function upd(k,val){setV(p=>({...p,[k]:val}));}
  function submit(){
    if(!v.fournisseur.trim()||!v.numeroCommande.trim()){alert("Fournisseur et N° de commande sont obligatoires.");return;}
    onSave(v,arFile,removeAr);
  }
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:16}}>
    <div style={{background:"#fff",borderRadius:12,padding:24,width:480,maxWidth:"100%",maxHeight:"90vh",overflowY:"auto"}}>
      <h3 style={{margin:"0 0 16px",fontSize:18,fontWeight:700}}>{isEdit?"Modifier la commande":"Nouvelle commande"}</h3>
      {doublon&&<div style={{background:"#FFF8E1",border:"1px solid #E8720C",borderRadius:6,padding:"8px 12px",marginBottom:14,fontSize:12,color:"#8A4B00"}}>⚠ Une commande n° <strong>{doublon.numeroCommande}</strong> ({doublon.fournisseur}) existe déjà dans le suivi, créée le {fmtDateFr(doublon.dateCommande)}. Vérifiez avant d'enregistrer pour éviter un doublon.</div>}
      <div style={{marginBottom:12}}><label style={S.lbl}>Fournisseur *</label><ChampFournisseur valeur={v.fournisseur} onChange={nv=>upd("fournisseur",nv)} fournisseurs={fournisseurs} onAddFournisseur={onAddFournisseur}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div><label style={S.lbl}>N° de commande *</label><input value={v.numeroCommande} onChange={e=>upd("numeroCommande",e.target.value)} style={S.inp}/></div>
        <div><label style={S.lbl}>N° de chantier</label><input value={v.numeroChantier} onChange={e=>upd("numeroChantier",e.target.value)} placeholder="DEXXXX" style={S.inp}/></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div><label style={S.lbl}>Type de commande</label><select value={v.typeCommande} onChange={e=>upd("typeCommande",e.target.value)} style={S.sel}>{TYPES_COMMANDE.map(t=><option key={t}>{t}</option>)}</select></div>
        <div><label style={S.lbl}>Livraison chez le client</label><select value={v.livraisonClient} onChange={e=>upd("livraisonClient",e.target.value)} style={S.sel}><option>Non</option><option>Oui</option></select></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 140px",gap:10,marginBottom:12}}>
        <div><label style={S.lbl}>Type de fournitures</label><input value={v.typeFournitures} onChange={e=>upd("typeFournitures",e.target.value)} style={S.inp}/></div>
        <div><label style={S.lbl}>Montant HT (€)</label><input type="number" step="0.01" value={v.montantHT||""} onChange={e=>upd("montantHT",e.target.value)} style={S.inp}/></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div><label style={S.lbl}>Date de commande</label><input type="date" value={v.dateCommande} onChange={e=>upd("dateCommande",e.target.value)} style={S.inp}/></div>
        <div><label style={S.lbl}>Délai de livraison prévu</label><input type="date" value={v.delaiLivraison} onChange={e=>upd("delaiLivraison",e.target.value)} style={S.inp}/></div>
      </div>
      <div style={{marginBottom:16}}>
        <label style={S.lbl}>AR de commande (PDF)</label>
        {arFile&&<div style={{fontSize:12,color:"#22863A",marginBottom:6}}>📎 {arFile.name}</div>}
        {v.hasAR&&!removeAr&&!arFile&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,fontSize:12,color:"#6B7280"}}>📎 Un AR est déjà attaché <button type="button" onClick={()=>setRemoveAr(true)} style={{...S.p2,fontSize:11,padding:"3px 8px",color:"#D73A49",borderColor:"#D73A49"}}>Retirer</button></div>}
        {removeAr&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#D73A49",marginBottom:6}}>L'AR sera retiré à l'enregistrement. <button type="button" onClick={()=>setRemoveAr(false)} style={{...S.p2,fontSize:11,padding:"3px 8px"}}>Annuler</button></div>}
        <input type="file" accept="application/pdf" onChange={e=>{setArFile(e.target.files[0]||null);setRemoveAr(false);}} style={S.inp}/>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={S.p2}>Annuler</button>
        <button onClick={submit} style={S.p1}>Enregistrer</button>
      </div>
    </div>
  </div>);
}

function ModalModeles({modeles,onSave,onClose}){
  const [m,setM]=useState(modeles);
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:16}}>
    <div style={{background:"#fff",borderRadius:12,padding:24,width:600,maxWidth:"100%",maxHeight:"90vh",overflowY:"auto"}}>
      <h3 style={{margin:"0 0 16px",fontSize:18,fontWeight:700}}>Modèles de relance</h3>
      <p style={{fontSize:12,color:"#6B7280",margin:"0 0 12px"}}>Jetons disponibles : {"{fournisseur} {commande} {chantier} {fournitures} {delai} {dateCommande}"}</p>
      <div style={{marginBottom:14}}>
        <label style={S.lbl}>Modèle — délai dépassé</label>
        <textarea value={m.delaiDepasse} onChange={e=>setM(p=>({...p,delaiDepasse:e.target.value}))} style={{...S.inp,height:130,fontFamily:"inherit",resize:"vertical"}}/>
      </div>
      <div style={{marginBottom:16}}>
        <label style={S.lbl}>Modèle — pas de délai reçu</label>
        <textarea value={m.pasDeDelai} onChange={e=>setM(p=>({...p,pasDeDelai:e.target.value}))} style={{...S.inp,height:130,fontFamily:"inherit",resize:"vertical"}}/>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={S.p2}>Annuler</button>
        <button onClick={()=>onSave(m)} style={S.p1}>Enregistrer</button>
      </div>
    </div>
  </div>);
}

function CarteCommande({c,ficheLiee,onOuvrirFiche,onCopier,onRecue,onEdit,onDelete,onVoirAr,onAjouterPiece,onVoirPiece,onSupprimerPiece,onDragStart,onDragEnd,onTouchStart,onTouchEnd,isDragging,arrangeable=true}){
  const [ouvert,setOuvert]=useState(false);
  const st=statutCommande(c);
  return(<div
    draggable={arrangeable}
    onDragStart={arrangeable?e=>onDragStart(e,c.id):undefined}
    onDragEnd={arrangeable?onDragEnd:undefined}
    onTouchStart={arrangeable?()=>onTouchStart(c.id):undefined}
    onTouchEnd={arrangeable?e=>onTouchEnd(e,c.id):undefined}
    style={{background:isDragging?"#EEF4FF":(c.recue?"#F8F9FA":"#fff"),border:"1px solid "+(isDragging?"#1B4F8A":"#E2E6EA"),borderRadius:8,marginBottom:8,opacity:isDragging?0.6:(c.recue?0.75:1),cursor:arrangeable?"grab":"default",userSelect:"none",transition:"opacity .15s,border-color .15s"}}>
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",cursor:"pointer"}} onClick={()=>setOuvert(!ouvert)}>
      {arrangeable&&<span style={{fontSize:12,color:"#9CA3AF"}}>⠿</span>}
      <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:st.color,flexShrink:0}}/>
      <div style={{flex:1,minWidth:0,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
        <span style={{fontSize:12,fontWeight:700}}>{c.fournisseur||"—"}</span>
        <span style={{fontSize:11,color:"#6B7280",marginLeft:6}}>{c.numeroChantier||("Cmd "+(c.numeroCommande||"—"))}</span>
      </div>
      {(c.hasAR||(c.pieces&&c.pieces.length>0))&&<span style={{fontSize:11}}>📎</span>}
      <span style={{fontSize:11,color:"#9CA3AF"}}>{ouvert?"▲":"▼"}</span>
    </div>
    {ouvert&&<div style={{padding:"0 10px 10px"}}>
      <div style={{marginBottom:6}}><span style={{display:"inline-block",padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700,color:st.color,background:st.bg}}>● {st.label}</span></div>
      <div style={{fontSize:11,color:"#1A1A2E",marginBottom:2}}>{c.typeCommande}{(c.typeFournitures||c.montantHT)?" · ":""}{c.typeFournitures&&c.montantHT?c.typeFournitures+" — "+fmtMontant(c.montantHT):(c.typeFournitures||(c.montantHT?fmtMontant(c.montantHT):""))}</div>
      <div style={{fontSize:11,color:"#9CA3AF",marginBottom:8}}>
        Cmd : {fmtDateFr(c.dateCommande)}<br/>
        Délai : {c.delaiLivraison?fmtDateFr(c.delaiLivraison):"non communiqué"}
        {c.recue&&c.dateReception&&<><br/>Reçue le {fmtDateFr(c.dateReception)}{c.delaiLivraison&&" — "+ecartReception(c)}</>}
        {c.livraisonClient==="Oui"&&<><br/>🚚 Livraison chez le client</>}
      </div>
      {ficheLiee&&<button onClick={()=>onOuvrirFiche(ficheLiee)} style={{...S.p2,fontSize:10,padding:"4px 7px",width:"100%",marginBottom:6,color:"#1B4F8A",borderColor:"#1B4F8A"}}>🔗 Voir la fiche {ficheLiee.client?"— "+ficheLiee.client:""}</button>}
      <div style={{marginBottom:8}}>
        <div style={{fontSize:9,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>Pièces jointes</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {(c.pieces||[]).map(p=><span key={p.id} style={{display:"inline-flex",alignItems:"center",gap:4,background:"#F1F3F5",borderRadius:14,padding:"3px 8px",fontSize:10}}>
            <span onClick={()=>onVoirPiece(p.url)} style={{cursor:"pointer",color:"#1B4F8A"}} title={p.nom}>📎 {p.nom.length>18?p.nom.slice(0,16)+"…":p.nom}</span>
            <span onClick={()=>onSupprimerPiece(c.id,p.id)} style={{cursor:"pointer",color:"#D73A49",fontWeight:700}}>✕</span>
          </span>)}
          <button onClick={()=>onAjouterPiece(c.id)} style={{...S.p2,fontSize:10,padding:"3px 8px"}}>+ 📎 Ajouter</button>
        </div>
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {!c.recue&&<button onClick={()=>onCopier(c)} style={{...S.p2,fontSize:10,padding:"4px 7px"}}>✉ Relance</button>}
        {c.hasAR&&<button onClick={()=>onVoirAr(c.arUrl)} style={{...S.p2,fontSize:10,padding:"4px 7px"}}>📄 AR</button>}
        <label style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:"#6B7280",cursor:"pointer"}}><input type="checkbox" checked={!!c.recue} onChange={e=>onRecue(c.id,e.target.checked)}/> Reçue</label>
        <button onClick={()=>onEdit(c)} style={{...S.p2,fontSize:10,padding:"4px 7px"}}>✏️</button>
        <button onClick={()=>onDelete(c.id)} style={{...S.p2,fontSize:10,padding:"4px 7px",color:"#D73A49",borderColor:"#D73A49"}}>🗑</button>
      </div>
    </div>}
  </div>);
}

const COULEUR_TYPE={"Fourniture seule":"#1B4F8A","Atelier":"#22863A","Intervention":"#E8720C"};

function StatsCommandes({commandes}){
  const [periode,setPeriode]=useState("total");

  function filtrerParPeriode(liste){
    if(periode==="total")return liste;
    const now=new Date();
    const mois=periode==="6mois"?6:12;
    const limite=new Date(now.getFullYear(),now.getMonth()-mois,now.getDate());
    return liste.filter(c=>c.dateCommande&&new Date(c.dateCommande)>=limite);
  }

  const toutes=commandes.filter(c=>!c.brouillon);
  const commandesFilt=filtrerParPeriode(toutes);
  const total=commandesFilt.length;
  const montantTotal=commandesFilt.reduce((s,c)=>s+(parseFloat(c.montantHT)||0),0);

  const parType={};TYPES_COMMANDE.forEach(t=>{parType[t]=commandesFilt.filter(c=>c.typeCommande===t).length;});

  const parFournisseur={};
  commandesFilt.forEach(c=>{
    const f=c.fournisseur||"—";
    if(!parFournisseur[f])parFournisseur[f]={n:0,montant:0};
    parFournisseur[f].n++;
    parFournisseur[f].montant+=parseFloat(c.montantHT)||0;
  });
  const fournisseurList=Object.entries(parFournisseur).sort((a,b)=>b[1].n-a[1].n).slice(0,8);
  const maxFournisseur=fournisseurList[0]?.[1].n||1;

  const parMois={};
  const now2=new Date();
  for(let i=5;i>=0;i--){
    const d=new Date(now2.getFullYear(),now2.getMonth()-i,1);
    const k=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    parMois[k]=0;
  }
  toutes.forEach(c=>{
    if(c.dateCommande){
      const d=new Date(c.dateCommande+"T00:00:00");
      const k=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
      if(parMois[k]!==undefined)parMois[k]++;
    }
  });
  const moisData=Object.entries(parMois);
  const maxMois=Math.max(...moisData.map(m=>m[1]),1);

  const recuesAvecDelai=commandesFilt.filter(c=>c.recue&&c.dateReception&&c.delaiLivraison);
  const aTemps=recuesAvecDelai.filter(c=>new Date(c.dateReception+"T00:00:00")<=new Date(c.delaiLivraison+"T00:00:00")).length;
  const tauxATemps=recuesAvecDelai.length>0?Math.round((aTemps/recuesAvecDelai.length)*100):null;

  const card=(titre,valeur,detail,color="#1B4F8A")=>(
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"14px 16px"}}>
      <div style={{fontSize:11,color:"#6B7280",marginBottom:4,fontWeight:500}}>{titre}</div>
      <div style={{fontSize:24,fontWeight:700,color,lineHeight:1.2}}>{valeur}</div>
      {detail&&<div style={{fontSize:11,color:"#9CA3AF",marginTop:4}}>{detail}</div>}
    </div>
  );

  return(<div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",gap:6}}>
        {[["6mois","6 derniers mois"],["annee","Dernière année"],["total","Total"]].map(([v,l])=>(
          <button key={v} onClick={()=>setPeriode(v)} style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid "+(periode===v?"#1B4F8A":"#E2E6EA"),background:periode===v?"#1B4F8A":"#fff",color:periode===v?"#fff":"#6B7280",fontSize:12,fontWeight:600,cursor:"pointer"}}>{l}</button>
        ))}
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:20}}>
      {card("Commandes",total,"","#1B4F8A")}
      {card("Montant total HT",fmtMontant(montantTotal)||"0,00 € HT","","#22863A")}
      {card("Fournisseur principal",fournisseurList[0]?fournisseurList[0][0]:"—",fournisseurList[0]?fournisseurList[0][1].n+" commande"+(fournisseurList[0][1].n>1?"s":""):"","#E8720C")}
      {tauxATemps!==null&&card("Livré à temps",tauxATemps+"%","Sur "+recuesAvecDelai.length+" commande"+(recuesAvecDelai.length>1?"s":"")+" reçues","#6B7280")}
    </div>

    <div style={{fontSize:13,fontWeight:700,color:"#1B4F8A",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #EEF4FF"}}>Répartition par type</div>
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"14px 16px",marginBottom:20}}>
      {total===0&&<div style={{fontSize:12,color:"#9CA3AF",textAlign:"center",padding:12}}>Aucune donnée</div>}
      {TYPES_COMMANDE.map(t=>{
        const n=parType[t]||0;
        const pct=total>0?Math.round((n/total)*100):0;
        return(<div key={t} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <span style={{fontSize:12,fontWeight:600,color:COULEUR_TYPE[t],width:120,flexShrink:0}}>{t}</span>
          <div style={{flex:1,background:"#F5F6F8",borderRadius:20,height:8,overflow:"hidden"}}>
            <div style={{height:8,borderRadius:20,background:COULEUR_TYPE[t],width:pct+"%",transition:"width .4s"}}/>
          </div>
          <span style={{fontSize:12,fontWeight:700,color:"#1A1A2E",width:30,textAlign:"right"}}>{n}</span>
          <span style={{fontSize:11,color:"#9CA3AF",width:32}}>{pct}%</span>
        </div>);
      })}
    </div>

    <div style={{fontSize:13,fontWeight:700,color:"#1B4F8A",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #EEF4FF"}}>Commandes — 6 derniers mois</div>
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"14px 16px",marginBottom:20}}>
      <div style={{display:"flex",alignItems:"flex-end",gap:8,height:80}}>
        {moisData.map(([k,n])=>{
          const h=maxMois>0?Math.round((n/maxMois)*64):0;
          const [y,m]=k.split("-");
          const nom=["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"][parseInt(m)-1];
          return(<div key={k} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <span style={{fontSize:10,fontWeight:700,color:"#1B4F8A"}}>{n||""}</span>
            <div style={{width:"100%",background:"#EEF4FF",borderRadius:"4px 4px 0 0",height:h+4,minHeight:4,transition:"height .4s"}}/>
            <span style={{fontSize:9,color:"#9CA3AF"}}>{nom}</span>
          </div>);
        })}
      </div>
    </div>

    <div style={{fontSize:13,fontWeight:700,color:"#1B4F8A",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #EEF4FF"}}>Par fournisseur</div>
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"12px 16px"}}>
      {fournisseurList.length===0&&<div style={{fontSize:12,color:"#9CA3AF",textAlign:"center",padding:12}}>Aucune donnée</div>}
      {fournisseurList.map(([f,d])=>(
        <div key={f} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <span style={{fontSize:12,fontWeight:600,color:"#1A1A2E",width:140,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={f}>{f}</span>
          <div style={{flex:1,background:"#F5F6F8",borderRadius:20,height:6,overflow:"hidden"}}>
            <div style={{height:6,borderRadius:20,background:"#1B4F8A",width:Math.round((d.n/maxFournisseur)*100)+"%"}}/>
          </div>
          <span style={{fontSize:12,fontWeight:700,color:"#1A1A2E",width:20,textAlign:"right"}}>{d.n}</span>
          <span style={{fontSize:11,color:"#9CA3AF",width:80,textAlign:"right"}}>{fmtMontant(d.montant)}</span>
        </div>
      ))}
    </div>
  </div>);
}

function PageCommandes({fiches,onOuvrirFiche,onResume}){
  const [commandes,setCommandes]=useState([]);
  const [modeles,setModeles]=useState({delaiDepasse:MODELE_DELAI_DEPASSE_DEFAUT,pasDeDelai:MODELE_PAS_DE_DELAI_DEFAUT});
  const [fournisseurs,setFournisseurs]=useState([]);
  const [chargement,setChargement]=useState(true);
  const [migrationDispo,setMigrationDispo]=useState(()=>migrationCommandesDisponible());
  const [migrationEnCours,setMigrationEnCours]=useState(false);
  const [vue,setVue]=useState("actives"); // actives | recues | stats
  const [recherche,setRecherche]=useState("");
  const [dragId,setDragId]=useState(null);
  const [dragOverType,setDragOverType]=useState(null);
  const [modalCommande,setModalCommande]=useState(null);
  const [modalArFile,setModalArFile]=useState(null);
  const [modalModeles,setModalModeles]=useState(false);
  const [flash,setFlash]=useState(null);
  const [confirmSuppr,setConfirmSuppr]=useState(null);
  const [chargementAr,setChargementAr]=useState(false);
  const fileInputArRef=useRef(null);
  const [pieceCibleId,setPieceCibleId]=useState(null);
  const fileInputPieceRef=useRef(null);
  const [dernierSupprime,setDernierSupprime]=useState(null);
  const timeoutSuppressionRef=useRef(null);

  const [dossierEtat,setDossierEtat]=useState("verification"); // verification | indisponible | non_lie | besoin_permission | actif
  const [journal,setJournal]=useState(()=>chargerJournalWatcher());
  const [journalOuvert,setJournalOuvert]=useState(false);
  const dossierHandleRef=useRef(null);
  const fichiersVusRef=useRef(new Set(chargerFichiersVus()));
  const commandesRef=useRef(commandes);
  const scanRef=useRef(null);

  useEffect(()=>{
    let annule=false;
    Promise.all([chargerCommandesCloud(),chargerModelesCloud(),chargerFournisseursCloud()]).then(([c,m,f])=>{
      if(annule)return;
      setCommandes(c);setModeles(m);setFournisseurs(f);setChargement(false);
    });
    return()=>{annule=true;};
  },[]);
  useEffect(()=>{commandesRef.current=commandes;},[commandes]);
  useEffect(()=>{if(onResume)onResume(calculerResumeCommandes(commandes));},[commandes]);

  function ajouterJournal(msg){
    setJournal(prev=>{
      const next=[{t:Date.now(),msg},...prev].slice(0,20);
      sauverJournalWatcher(next);
      return next;
    });
  }

  async function traiterNouveauPdf(name,file){
    const id="cmd_"+Date.now()+"_"+Math.random().toString(36).slice(2,8);
    let arUrl=null;
    try{
      const path="commandes/"+id+"/"+name;
      await db.uploadPhoto(path,file);
      arUrl=db.photoUrl(path);
    }catch(e){}
    let d={fournisseur:"",numeroChantier:"",numeroCommande:"",dateCommande:"",typeFournitures:"",montantHT:""};
    let erreurLecture=false;
    try{
      const lignes=await extraireLignesPdf(file);
      d=analyserArPdf(lignes);
    }catch(e){erreurLecture=true;}
    const doublon=trouverDoublon(d.numeroCommande,commandesRef.current);
    if(doublon){
      ajouterJournal("⏭ "+name+" ignoré — doublon de la commande "+doublon.numeroCommande);
      if(arUrl)db.deleteFile(pathDeUrlPhoto(arUrl)).catch(()=>{});
      return;
    }
    const nouvelle={id,fournisseur:d.fournisseur,numeroCommande:d.numeroCommande,numeroChantier:d.numeroChantier,typeCommande:"Fourniture seule",typeFournitures:d.typeFournitures,montantHT:d.montantHT,dateCommande:d.dateCommande||today(),delaiLivraison:"",livraisonClient:"Non",recue:false,hasAR:!!arUrl,arUrl,brouillon:true,nomFichierSource:name,pieces:[]};
    setCommandes(prev=>[...prev,nouvelle]);
    try{await db.post("commandes_fournisseurs",commandeToRow(nouvelle));}catch(e){}
    ajouterJournal(erreurLecture?"⚠ "+name+" : lecture impossible, ajouté en brouillon vide à compléter":"✅ "+name+" → commande à compléter créée"+(d.numeroCommande?" ("+d.numeroCommande+")":""));
  }

  scanRef.current=async function scan(){
    const handle=dossierHandleRef.current;
    if(!handle)return;
    try{
      const entries=[];
      for await(const [name,h] of handle.entries()){
        if(h.kind==="file"&&/\.pdf$/i.test(name))entries.push([name,h]);
      }
      for(const [name,h] of entries){
        const file=await h.getFile();
        const empreinte=name+"|"+file.size+"|"+file.lastModified;
        if(fichiersVusRef.current.has(empreinte))continue;
        fichiersVusRef.current.add(empreinte);
        sauverFichiersVus(fichiersVusRef.current);
        await traiterNouveauPdf(name,file);
      }
    }catch(e){ajouterJournal("⚠ Erreur de lecture du dossier lié : "+e.message);}
  };

  useEffect(()=>{
    if(!("showDirectoryPicker" in window)){setDossierEtat("indisponible");return;}
    let annule=false;
    (async()=>{
      const handle=await chargerDossierHandle();
      if(annule)return;
      if(!handle){setDossierEtat("non_lie");return;}
      dossierHandleRef.current=handle;
      const perm=await handle.queryPermission({mode:"read"}).catch(()=>"denied");
      if(annule)return;
      setDossierEtat(perm==="granted"?"actif":"besoin_permission");
    })();
    return()=>{annule=true;};
  },[]);

  useEffect(()=>{
    if(dossierEtat!=="actif")return;
    let annule=false;
    function tick(){if(!annule&&scanRef.current)scanRef.current();}
    tick();
    const interval=setInterval(tick,25000);
    return()=>{annule=true;clearInterval(interval);};
  },[dossierEtat]);

  async function lierDossier(){
    try{
      const handle=await window.showDirectoryPicker({id:"pmv-commandes",mode:"read"});
      await sauverDossierHandle(handle).catch(()=>{});
      dossierHandleRef.current=handle;
      setDossierEtat("actif");
      setFlash("📁 Dossier lié — surveillance active");
      setTimeout(()=>setFlash(null),3000);
    }catch(e){/* sélection annulée par l'utilisateur */}
  }
  async function autoriserDossier(){
    try{
      const perm=await dossierHandleRef.current.requestPermission({mode:"read"});
      if(perm==="granted")setDossierEtat("actif");
    }catch(e){}
  }

  async function onFichierArChoisi(e){
    const file=e.target.files[0];e.target.value="";
    if(!file)return;
    setChargementAr(true);
    try{
      const lignes=await extraireLignesPdf(file);
      const d=analyserArPdf(lignes);
      setModalArFile(file);
      setModalCommande({
        fournisseur:d.fournisseur,numeroCommande:d.numeroCommande,numeroChantier:d.numeroChantier,
        typeCommande:"Fourniture seule",typeFournitures:d.typeFournitures,montantHT:d.montantHT,
        dateCommande:d.dateCommande||today(),delaiLivraison:"",livraisonClient:"Non",recue:false
      });
      const trouve=Object.values(d).filter(Boolean).length;
      setFlash(trouve>0?"📄 AR analysé — vérifiez les champs pré-remplis avant d'enregistrer":"⚠ Aucune information reconnue dans ce PDF — remplissez le formulaire manuellement");
      setTimeout(()=>setFlash(null),4000);
    }catch(err){
      setModalArFile(file);
      setModalCommande({});
      setFlash("⚠ Impossible de lire ce PDF (scan sans texte ?) — remplissez le formulaire manuellement");
      setTimeout(()=>setFlash(null),4000);
    }finally{setChargementAr(false);}
  }

  const brouillons=commandes.filter(c=>c.brouillon);
  const totalRecues=commandes.filter(c=>c.recue&&!c.brouillon).length;
  const q=recherche.trim().toLowerCase();
  function matchQ(c){return !q||[c.fournisseur,c.numeroCommande,c.numeroChantier,c.typeFournitures].some(x=>(x||"").toLowerCase().includes(q));}
  const actives=commandes.filter(c=>!c.brouillon&&!c.recue&&matchQ(c));
  const recues=commandes.filter(c=>!c.brouillon&&c.recue&&matchQ(c)).sort((a,b)=>(b.dateReception||"").localeCompare(a.dateReception||""));
  function parType(t){return trierCommandes(actives.filter(c=>c.typeCommande===t));}
  const montantColonne=t=>parType(t).reduce((s,c)=>s+(parseFloat(c.montantHT)||0),0);
  const nbRetard=actives.filter(c=>{const id=statutCommande(c).id;return id==="retard_fort"||id==="retard_leger";}).length;
  const nbSansDelai=actives.filter(c=>statutCommande(c).id==="sans_delai_urgent").length;
  const fichesParDe={};(fiches||[]).forEach(f=>{if(f.de)fichesParDe[f.de.trim().toLowerCase()]=f;});
  function ficheLieePour(c){return c.numeroChantier?fichesParDe[c.numeroChantier.trim().toLowerCase()]||null:null;}

  function changerType(id,type){
    setCommandes(prev=>prev.map(c=>c.id===id?{...c,typeCommande:type}:c));
  }
  function handleDragStart(e,id){setDragId(id);e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",id);}
  function handleDragOver(e,type){e.preventDefault();e.dataTransfer.dropEffect="move";setDragOverType(type);}
  function handleDrop(e,type){e.preventDefault();if(dragId)changerType(dragId,type);setDragId(null);setDragOverType(null);}
  function handleDragEnd(){setDragId(null);setDragOverType(null);}
  function handleTouchStart(id){setDragId(id);}
  function handleTouchEnd(e,id){
    const touch=e.changedTouches[0];
    const el=document.elementFromPoint(touch.clientX,touch.clientY);
    const col=el?.closest("[data-type]");
    if(col){const newType=col.getAttribute("data-type");if(newType)changerType(id,newType);}
    setDragId(null);setDragOverType(null);
  }

  async function ajouter(v,arFile){
    const id="cmd_"+Date.now()+"_"+Math.random().toString(36).slice(2,8);
    let arUrl=null;
    if(arFile){
      try{const path="commandes/"+id+"/"+arFile.name;await db.uploadPhoto(path,arFile);arUrl=db.photoUrl(path);}catch(e){}
    }
    const nouvelle={...v,id,hasAR:!!arUrl,arUrl,pieces:v.pieces||[]};
    setCommandes(prev=>[...prev,nouvelle]);
    setModalCommande(null);
    setFlash("Commande ajoutée");setTimeout(()=>setFlash(null),2000);
    try{await db.post("commandes_fournisseurs",commandeToRow(nouvelle));}catch(e){}
  }
  async function modifier(v,arFile,removeAr){
    let arUrl=v.arUrl||null;
    if(arFile){
      try{const path="commandes/"+v.id+"/"+arFile.name;await db.uploadPhoto(path,arFile);arUrl=db.photoUrl(path);}catch(e){}
    }else if(removeAr){
      arUrl=null;
    }
    const nv={...v,hasAR:!!arUrl,arUrl,brouillon:false};
    setCommandes(prev=>prev.map(c=>c.id===nv.id?nv:c));
    setModalCommande(null);
    setFlash("Commande modifiée");setTimeout(()=>setFlash(null),2000);
    try{await db.patch("commandes_fournisseurs","?id=eq."+nv.id,commandeToRow(nv));}catch(e){}
  }
  function onAddFournisseur(nom){
    setFournisseurs(prev=>{
      if(prev.some(f=>f.toLowerCase()===nom.toLowerCase()))return prev;
      return [...prev,nom].sort((a,b)=>a.localeCompare(b));
    });
    ajouterFournisseurCloud(nom);
  }
  function marquerRecue(id,val){
    const dateReception=val?today():"";
    setCommandes(prev=>prev.map(c=>c.id===id?{...c,recue:val,dateReception}:c));
    db.patch("commandes_fournisseurs","?id=eq."+id,{recue:val,date_reception:dateReception}).catch(()=>{});
  }
  async function purgerFichiers(cmd){
    if(cmd.arUrl){try{await db.deleteFile(pathDeUrlPhoto(cmd.arUrl));}catch(e){}}
    for(const p of cmd.pieces||[]){if(p.url){try{await db.deleteFile(pathDeUrlPhoto(p.url));}catch(e){}}}
  }
  function supprimer(id){
    const cmd=commandes.find(c=>c.id===id);
    if(!cmd)return;
    setCommandes(prev=>prev.filter(c=>c.id!==id));
    setConfirmSuppr(null);
    db.del("commandes_fournisseurs","?id=eq."+id).catch(()=>{});
    if(timeoutSuppressionRef.current){
      clearTimeout(timeoutSuppressionRef.current);
      timeoutSuppressionRef.current=null;
      if(dernierSupprime)purgerFichiers(dernierSupprime); // purge l'action non annulée précédente avant de la remplacer
    }
    setDernierSupprime(cmd);
    timeoutSuppressionRef.current=setTimeout(()=>{
      purgerFichiers(cmd);
      setDernierSupprime(null);
      timeoutSuppressionRef.current=null;
    },6000);
  }
  function annulerSuppression(){
    if(!dernierSupprime)return;
    if(timeoutSuppressionRef.current){clearTimeout(timeoutSuppressionRef.current);timeoutSuppressionRef.current=null;}
    setCommandes(prev=>[...prev,dernierSupprime]);
    db.post("commandes_fournisseurs",commandeToRow(dernierSupprime)).catch(()=>{});
    setDernierSupprime(null);
  }
  function declencherAjoutPiece(id){setPieceCibleId(id);fileInputPieceRef.current?.click();}
  async function onFichierPieceChoisi(e){
    const file=e.target.files[0];e.target.value="";
    if(!file||!pieceCibleId)return;
    const cibleId=pieceCibleId;setPieceCibleId(null);
    const pieceId=cibleId+"_"+Date.now()+"_"+Math.random().toString(36).slice(2,6);
    try{
      const path="commandes/"+cibleId+"/pieces/"+pieceId+"_"+file.name;
      await db.uploadPhoto(path,file);
      const url=db.photoUrl(path);
      const cible=commandes.find(c=>c.id===cibleId);
      const piecesMaj=[...(cible?.pieces||[]),{id:pieceId,nom:file.name,url,dateAjout:today()}];
      setCommandes(prev=>prev.map(c=>c.id===cibleId?{...c,pieces:piecesMaj}:c));
      await db.patch("commandes_fournisseurs","?id=eq."+cibleId,{pieces:piecesMaj});
      setFlash("📎 Pièce jointe ajoutée");setTimeout(()=>setFlash(null),2000);
    }catch(err){setFlash("⚠ Impossible d'ajouter cette pièce jointe");setTimeout(()=>setFlash(null),2500);}
  }
  async function supprimerPiece(commandeId,pieceId){
    const cible=commandes.find(c=>c.id===commandeId);
    const piece=cible?.pieces?.find(p=>p.id===pieceId);
    const piecesMaj=(cible?.pieces||[]).filter(p=>p.id!==pieceId);
    setCommandes(prev=>prev.map(c=>c.id===commandeId?{...c,pieces:piecesMaj}:c));
    try{await db.patch("commandes_fournisseurs","?id=eq."+commandeId,{pieces:piecesMaj});}catch(e){}
    if(piece?.url){try{await db.deleteFile(pathDeUrlPhoto(piece.url));}catch(e){}}
  }
  function voirPiece(url){
    if(!url){setFlash("⚠ Pièce jointe introuvable");setTimeout(()=>setFlash(null),2500);return;}
    const onglet=window.open(url,"_blank");
    if(!onglet)window.location.href=url;
  }
  async function copierRelance(cmd){
    const modele=cmd.delaiLivraison?modeles.delaiDepasse:modeles.pasDeDelai;
    const texte=remplacerJetons(modele,cmd)+"\n\n"+SIGNATURE_RELANCE;
    const ok=await copierTexte(texte);
    setFlash(ok?"✅ Relance copiée dans le presse-papier":"⚠ Impossible de copier — vérifiez les permissions du navigateur");
    setTimeout(()=>setFlash(null),2500);
  }
  function voirAr(url){
    if(!url){setFlash("⚠ Aucun AR retrouvé pour cette commande");setTimeout(()=>setFlash(null),2500);return;}
    const onglet=window.open(url,"_blank");
    if(!onglet)window.location.href=url; // fenêtre bloquée par le navigateur : on ouvre dans l'onglet courant
  }
  async function migrerVersCloud(){
    setMigrationEnCours(true);
    try{
      const legacyCommandes=chargerCommandes();
      const legacyFournisseurs=chargerFournisseurs();
      const legacyModeles=chargerModeles();
      let compte=0;
      for(const c of legacyCommandes){
        let arUrl=null;
        if(c.hasAR){
          try{
            const blob=await chargerArPdf(c.id);
            if(blob){
              const path="commandes/"+c.id+"/"+(c.nomFichierSource||"ar.pdf");
              await db.uploadPhoto(path,new File([blob],c.nomFichierSource||"ar.pdf",{type:blob.type||"application/pdf"}));
              arUrl=db.photoUrl(path);
            }
          }catch(e){}
        }
        const piecesMigrees=[];
        for(const p of c.pieces||[]){
          try{
            const blob=await chargerPieceJointe(p.id);
            if(blob){
              const path="commandes/"+c.id+"/pieces/"+p.id+"_"+p.nom;
              await db.uploadPhoto(path,new File([blob],p.nom,{type:blob.type||"application/octet-stream"}));
              piecesMigrees.push({id:p.id,nom:p.nom,url:db.photoUrl(path),dateAjout:p.dateAjout});
            }
          }catch(e){}
        }
        const migree={...c,arUrl,hasAR:!!arUrl,pieces:piecesMigrees};
        try{await db.post("commandes_fournisseurs",commandeToRow(migree));compte++;}catch(e){}
      }
      for(const f of legacyFournisseurs){
        try{await db.upsert("fournisseurs_commandes",{nom:f},"nom");}catch(e){}
      }
      try{await sauverModelesCloud(legacyModeles);}catch(e){}
      localStorage.setItem(MIGRATION_CLOUD_FLAG_KEY,"1");
      setMigrationDispo(false);
      setFlash("☁ "+compte+" commande"+(compte>1?"s":"")+" migrée"+(compte>1?"s":"")+" vers le cloud");
      setTimeout(()=>setFlash(null),4000);
      const [fraiches,foursFraiches,modelesFrais]=await Promise.all([chargerCommandesCloud(),chargerFournisseursCloud(),chargerModelesCloud()]);
      setCommandes(fraiches);setFournisseurs(foursFraiches);setModeles(modelesFrais);
    }catch(e){
      setFlash("⚠ Erreur pendant la migration — réessayez");setTimeout(()=>setFlash(null),3000);
    }finally{setMigrationEnCours(false);}
  }

  if(chargement){
    return(<div style={{maxWidth:1400,margin:"0 auto",padding:"60px 16px",textAlign:"center",color:"#9CA3AF"}}>Chargement du suivi des commandes…</div>);
  }

  return(<div style={{maxWidth:1400,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}}>
      <div>
        <h2 style={{fontSize:20,fontWeight:700,margin:0}}>📦 Suivi des commandes fournisseurs</h2>
        <p style={{fontSize:12,color:"#9CA3AF",margin:"3px 0 0"}}>Visible sur tous les appareils connectés à l'appli.</p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <input ref={fileInputArRef} type="file" accept="application/pdf" style={{display:"none"}} onChange={onFichierArChoisi}/>
        <input ref={fileInputPieceRef} type="file" accept="application/pdf,image/*" style={{display:"none"}} onChange={onFichierPieceChoisi}/>
        <button onClick={()=>fileInputArRef.current?.click()} disabled={chargementAr} style={{...S.p2,fontSize:12,padding:"7px 14px"}}>{chargementAr?"Analyse en cours…":"📄 Importer un AR (PDF)"}</button>
        <button onClick={()=>setModalModeles(true)} style={{...S.p2,fontSize:12,padding:"7px 14px"}}>⚙ Modèles de relance</button>
        <button onClick={()=>setModalCommande({})} style={{...S.p1,fontSize:12,padding:"7px 14px"}}>+ Nouvelle commande</button>
      </div>
    </div>

    {migrationDispo&&<div style={{background:"#EEF4FF",border:"1px solid #1B4F8A",borderRadius:10,padding:"12px 14px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
      <div style={{fontSize:12,color:"#1B4F8A"}}>☁ Des commandes enregistrées sur cet appareil ne sont pas encore visibles sur les autres. Migrez-les une fois vers le cloud partagé.</div>
      <button onClick={migrerVersCloud} disabled={migrationEnCours} style={{...S.p1,fontSize:12,padding:"7px 14px"}}>{migrationEnCours?"Migration en cours…":"☁ Migrer vers le cloud"}</button>
    </div>}

    <div style={{display:"flex",gap:6,marginBottom:14,background:"#F1F3F5",borderRadius:8,padding:4,width:"fit-content"}}>
      <button onClick={()=>setVue("actives")} style={{border:"none",borderRadius:6,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",background:vue==="actives"?"#1B4F8A":"transparent",color:vue==="actives"?"#fff":"#6B7280"}}>📋 En cours</button>
      <button onClick={()=>setVue("recues")} style={{border:"none",borderRadius:6,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",background:vue==="recues"?"#1B4F8A":"transparent",color:vue==="recues"?"#fff":"#6B7280"}}>✅ Reçues ({totalRecues})</button>
      <button onClick={()=>setVue("stats")} style={{border:"none",borderRadius:6,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",background:vue==="stats"?"#1B4F8A":"transparent",color:vue==="stats"?"#fff":"#6B7280"}}>📊 Statistiques</button>
    </div>

    {vue==="actives"&&(nbRetard>0||nbSansDelai>0)&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
      {nbRetard>0&&<span style={{background:"#FFF5F5",color:"#D73A49",fontSize:12,padding:"4px 12px",borderRadius:20,fontWeight:600}}>🔴 {nbRetard} en retard de livraison</span>}
      {nbSansDelai>0&&<span style={{background:"#FFF8E1",color:"#8A4B00",fontSize:12,padding:"4px 12px",borderRadius:20,fontWeight:600}}>🟡 {nbSansDelai} sans délai depuis 7j+</span>}
    </div>}

    {vue==="actives"&&dossierEtat!=="indisponible"&&dossierEtat!=="verification"&&<div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",background:"#F8F9FA",border:"1px solid #E2E6EA",borderRadius:8,padding:"8px 12px",marginBottom:14,fontSize:12}}>
      {dossierEtat==="non_lie"&&<>
        <span style={{color:"#6B7280"}}>📁 Surveillance automatique du dossier Commandes : non liée.</span>
        <button onClick={lierDossier} style={{...S.p2,fontSize:11,padding:"4px 10px"}}>🔗 Lier le dossier Commandes</button>
      </>}
      {dossierEtat==="besoin_permission"&&<>
        <span style={{color:"#8A4B00"}}>🔓 Le dossier lié a besoin d'une autorisation pour reprendre la surveillance.</span>
        <button onClick={autoriserDossier} style={{...S.p2,fontSize:11,padding:"4px 10px"}}>Autoriser l'accès</button>
      </>}
      {dossierEtat==="actif"&&<>
        <span style={{color:"#22863A"}}>🟢 Dossier Commandes surveillé — nouveaux PDF détectés automatiquement.</span>
        <button onClick={()=>scanRef.current&&scanRef.current()} style={{...S.p2,fontSize:11,padding:"4px 10px"}}>🔄 Vérifier maintenant</button>
      </>}
      {journal.length>0&&<button onClick={()=>setJournalOuvert(!journalOuvert)} style={{...S.p2,fontSize:11,padding:"4px 10px",marginLeft:"auto"}}>{journalOuvert?"Masquer le journal":"Journal ("+journal.length+")"}</button>}
    </div>}
    {vue==="actives"&&journalOuvert&&journal.length>0&&<div style={{background:"#fff",border:"1px solid #E2E6EA",borderRadius:8,padding:"8px 12px",marginBottom:14,fontSize:11,color:"#6B7280",maxHeight:160,overflowY:"auto"}}>
      {journal.map((j,i)=><div key={i} style={{padding:"3px 0",borderBottom:i<journal.length-1?"1px solid #F3F4F6":"none"}}>{new Date(j.t).toLocaleString("fr-FR")} — {j.msg}</div>)}
    </div>}

    {vue==="actives"&&brouillons.length>0&&<div style={{background:"#FFF8E1",border:"1px solid #E8720C",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
      <div style={{fontSize:13,fontWeight:700,color:"#8A4B00",marginBottom:8}}>🗂 À compléter ({brouillons.length}) — détectées automatiquement depuis le dossier Commandes</div>
      {brouillons.map(c=><div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,background:"#fff",border:"1px solid #F3D9A8",borderRadius:6,padding:"8px 10px",marginBottom:6}}>
        <div style={{fontSize:12}}>
          <strong>{c.fournisseur||"Fournisseur inconnu"}</strong>{c.numeroCommande?" — Cmd "+c.numeroCommande:""}{c.numeroChantier?" · "+c.numeroChantier:""}
          <div style={{fontSize:11,color:"#9CA3AF"}}>📎 {c.nomFichierSource||"AR importé"}</div>
        </div>
        <button onClick={()=>setModalCommande(c)} style={{...S.p1,fontSize:11,padding:"5px 10px",whiteSpace:"nowrap"}}>✏️ Compléter</button>
      </div>)}
    </div>}

    <input value={recherche} onChange={e=>setRecherche(e.target.value)} placeholder="🔍 Rechercher (fournisseur, n° commande, chantier, fournitures)…" style={{...S.inp,marginBottom:14}}/>

    {flash&&<div style={{...S.ok,marginBottom:12}}>{flash}</div>}

    {vue==="actives"&&<>
      <p style={{fontSize:11,color:"#9CA3AF",margin:"0 0 10px",textAlign:"right"}}>💡 Glissez les cartes entre les colonnes pour changer le type</p>
      {actives.length===0&&<div style={{textAlign:"center",padding:40,color:"#9CA3AF",background:"#fff",borderRadius:10,border:"1px solid #E2E6EA"}}>{q?"Aucune commande ne correspond à la recherche":"Aucune commande en cours"}</div>}
      {actives.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(260px,1fr))",gap:14,overflowX:"auto"}}>
        {TYPES_COMMANDE.map(t=>{
          const liste=parType(t);
          const montant=montantColonne(t);
          return(<div key={t}
            data-type={t}
            onDragOver={e=>handleDragOver(e,t)}
            onDrop={e=>handleDrop(e,t)}
            onDragEnd={handleDragEnd}
            style={{background:dragOverType===t?"#EEF4FF":"#F1F3F5",borderRadius:10,border:"1.5px solid "+(dragOverType===t?"#1B4F8A":"#E2E6EA"),padding:"10px 10px",minHeight:120,transition:"background .15s,border-color .15s"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:13,fontWeight:700,color:"#1B4F8A"}}>{t}</span>
              <span style={{fontSize:11,background:"#fff",border:"1px solid #E2E6EA",borderRadius:20,padding:"1px 8px",color:"#6B7280"}}>{liste.length}</span>
            </div>
            {montant>0&&<div style={{fontSize:11,color:"#6B7280",marginBottom:8}}>{fmtMontant(montant)}</div>}
            {montant===0&&<div style={{marginBottom:8}}/>}
            {liste.length===0&&<p style={{fontSize:12,color:"#9CA3AF",textAlign:"center",padding:"16px 0",margin:0}}>Vide</p>}
            {liste.map(c=><CarteCommande key={c.id} c={c} ficheLiee={ficheLieePour(c)} onOuvrirFiche={onOuvrirFiche} onCopier={copierRelance} onRecue={marquerRecue} onEdit={setModalCommande} onDelete={id=>setConfirmSuppr(id)} onVoirAr={voirAr} onAjouterPiece={declencherAjoutPiece} onVoirPiece={voirPiece} onSupprimerPiece={supprimerPiece} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} isDragging={dragId===c.id}/>)}
          </div>);
        })}
      </div>}
    </>}

    {vue==="recues"&&<>
      {recues.length===0&&<div style={{textAlign:"center",padding:40,color:"#9CA3AF",background:"#fff",borderRadius:10,border:"1px solid #E2E6EA"}}>{q?"Aucune commande reçue ne correspond à la recherche":"Aucune commande reçue pour le moment"}</div>}
      {recues.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
        {recues.map(c=><CarteCommande key={c.id} c={c} ficheLiee={ficheLieePour(c)} onOuvrirFiche={onOuvrirFiche} onCopier={copierRelance} onRecue={marquerRecue} onEdit={setModalCommande} onDelete={id=>setConfirmSuppr(id)} onVoirAr={voirAr} onAjouterPiece={declencherAjoutPiece} onVoirPiece={voirPiece} onSupprimerPiece={supprimerPiece} arrangeable={false}/>)}
      </div>}
    </>}

    {vue==="stats"&&<StatsCommandes commandes={commandes}/>}

    {modalCommande&&<ModalCommande initial={Object.keys(modalCommande).length?modalCommande:null} isEdit={!!modalCommande.id} initialArFile={modalCommande.id?null:modalArFile} commandes={commandes} fournisseurs={fournisseurs} onAddFournisseur={onAddFournisseur} onSave={modalCommande.id?modifier:ajouter} onClose={()=>{setModalCommande(null);setModalArFile(null);}}/>}
    {modalModeles&&<ModalModeles modeles={modeles} onSave={m=>{setModeles(m);setModalModeles(false);sauverModelesCloud(m);}} onClose={()=>setModalModeles(false)}/>}
    {confirmSuppr&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <div style={{background:"#fff",borderRadius:12,padding:24,width:340}}>
        <p style={{margin:"0 0 16px",fontWeight:600}}>Supprimer cette commande ?</p>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={()=>setConfirmSuppr(null)} style={S.p2}>Annuler</button>
          <button onClick={()=>supprimer(confirmSuppr)} style={{...S.p1,background:"#D73A49"}}>Supprimer</button>
        </div>
      </div>
    </div>}
    {dernierSupprime&&<div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:"#1A1A2E",color:"#fff",padding:"10px 18px",borderRadius:8,display:"flex",alignItems:"center",gap:14,zIndex:400,boxShadow:"0 4px 16px rgba(0,0,0,0.25)",fontSize:13}}>
      <span>🗑 Commande supprimée</span>
      <button onClick={annulerSuppression} style={{background:"transparent",border:"1px solid rgba(255,255,255,0.4)",color:"#fff",padding:"4px 12px",borderRadius:6,cursor:"pointer",fontWeight:600,fontSize:12}}>Annuler</button>
    </div>}
  </div>);
}

export default function App(){
  const [pinOk,setPinOk]=useState(()=>localStorage.getItem(PIN_KEY)==="1");
  const [page,setPage]=useState(()=>loadDraft()?"fiche":"accueil");const [sessionTech,setSessionTech]=useState(()=>loadDraft()?.sessionTech||null);const [ficheOuverte,setFicheOuverte]=useState(()=>{const d=loadDraft();return d?{id:d.ficheId,de:d.v?.de,client:d.v?.client,materiel_lieu:d.v?.materiel_lieu,type_materiel:d.typeMateriel,statut_chantier:d.statutChantier,etape_active:d.actif,etapes_validees:d.validees}:null;});const [ouvrirApercu,setOuvrirApercu]=useState(false);const [typeMat,setTypeMat]=useState(()=>loadDraft()?.typeMateriel||"Moteur");const [pieces,setPieces]=useState([]);const [demandeIdent,setDemandeIdent]=useState(false);const [pending,setPending]=useState(null);const [techs,setTechs]=useState(TECHNICIENS_FB);const [clients,setClients]=useState([]);const [categories,setCategories]=useState(CATS_FB.map(n=>({nom:n,slug:slugCat(n)})));const [fiches,setFiches]=useState([]);const [rapportFicheId,setRapportFicheId]=useState(null);const [seedValeurs,setSeedValeurs]=useState(null);

  useEffect(()=>{
    db.get("techniciens","?actif=eq.true&order=initiales").then(d=>{if(Array.isArray(d)&&d.length>0)setTechs(d.map(t=>t.initiales));}).catch(()=>{});
    db.get("clients","?order=nom").then(d=>{if(Array.isArray(d)&&d.length>0)setClients(d.map(c=>c.nom));}).catch(()=>{});
    db.get("categories_photos","?actif=eq.true&order=ordre").then(d=>{if(Array.isArray(d)&&d.length>0)setCategories(d);
    db.get("suivi_pieces","?order=created_at.desc").then(d=>{if(Array.isArray(d))setPieces(d);});}).catch(()=>{});
  },[]);

  function onAddClient(nom){setClients(prev=>[...prev,nom].sort());}
  async function dupliquerFiche(f){
    const type=f.type_materiel||"Moteur";
    const idsIdentite=champsIdentitePour(type);
    let seed={};
    try{
      const rows=await db.get("fiche_valeurs","?fiche_id=eq."+f.id+"&champ_id=in.("+idsIdentite.join(",")+")");
      if(Array.isArray(rows))rows.forEach(r=>{seed[r.champ_id]=r.valeur;});
    }catch(e){}
    setSeedValeurs(seed);
    setFicheOuverte(null);
    setTypeMat(type);
    setPage("fiche");
  }
  function askIdent(fn){setDemandeIdent(true);setPending(()=>fn);}
  function confirmIdent(t){setSessionTech(t);setDemandeIdent(false);if(pending){pending(t);setPending(null);}}
  function onFicheUpdated(id,updates){setFiches(prev=>prev.map(f=>f.id===id?{...f,...updates}:f));if(ficheOuverte?.id===id)setFicheOuverte(prev=>({...prev,...updates}));}
  async function onStatutChange(ficheId,newStatut){await db.patch("fiches","?id=eq."+ficheId,{statut_chantier:newStatut});onFicheUpdated(ficheId,{statut_chantier:newStatut});}

  const devisCount=fiches.filter(f=>(f.statut_chantier||"A_demonter")==="Devis").length;

  const [commandesResume,setCommandesResume]=useState({retard:0,aCompleter:0});
  useEffect(()=>{
    function rafraichir(){chargerCommandesCloud().then(c=>setCommandesResume(calculerResumeCommandes(c)));}
    rafraichir();
    const interval=setInterval(rafraichir,15000);
    window.addEventListener("focus",rafraichir);
    return()=>{clearInterval(interval);window.removeEventListener("focus",rafraichir);};
  },[]);
  const commandesAlerte=commandesResume.retard+commandesResume.aCompleter;

  const width=useWidth();
  const isMobile=width<900;
  const [menuOuvert,setMenuOuvert]=useState(false);
  if(!pinOk)return <ModalPin onSuccess={()=>setPinOk(true)}/>;

  const navItems=[
    {id:"dashboard",label:"🏠 Tableau de bord"},
    {id:"accueil",label:"📁 Fiche Atelier"},{id:"chantier",label:"🏗 Fiche Chantier"},
    {id:"planning",label:"📋 Planning"},
    {id:"rapport",label:"📧 Rapport"},
    {id:"suivi",label:"🔧 Matériel"},
    {id:"commandes",label:"📦 Commandes"},
    {id:"stats",label:"📊 Stats"},
  ];

  return(<div style={S.app}>
    {/* ── HEADER ── */}
    <div style={{...S.hdr,flexWrap:"nowrap",position:"sticky",top:0,zIndex:100}}>
      {/* Logo */}
      <img src={LOGO_B64} alt="PMV" style={{height:isMobile?30:40,objectFit:"contain",borderRadius:4,cursor:"pointer",flexShrink:0}} onClick={()=>{setPage("accueil");setMenuOuvert(false);}}/>

      {/* Onglets — masqués sur mobile */}
      {!isMobile&&<div style={{display:"flex",alignItems:"center",gap:4,flex:1,justifyContent:"center"}}>
        {navItems.map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{background:page===n.id?"rgba(255,255,255,0.25)":"transparent",color:"#fff",border:"none",padding:"6px 14px",borderRadius:6,fontSize:13,cursor:"pointer",fontWeight:page===n.id?700:400,position:"relative",whiteSpace:"nowrap"}}>
            {n.label}
            {n.id==="planning"&&devisCount>0&&<span style={{position:"absolute",top:-4,right:-4,background:"#E8720C",color:"#fff",borderRadius:10,padding:"1px 5px",fontSize:9,fontWeight:700}}>{devisCount}</span>}
            {n.id==="commandes"&&commandesAlerte>0&&<span style={{position:"absolute",top:-4,right:-4,background:"#D73A49",color:"#fff",borderRadius:10,padding:"1px 5px",fontSize:9,fontWeight:700}}>{commandesAlerte}</span>}
          </button>
        ))}
      </div>}

      {/* Droite */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:"auto",flexShrink:0}}>
        <BadgeStockage onClick={()=>setPage("stockage")}/>
        {!isMobile&&sessionTech&&<>
          <span style={{background:"rgba(255,255,255,0.2)",padding:"3px 10px",borderRadius:5,fontSize:12,fontWeight:700,color:"#fff"}}>{sessionTech}</span>
          <button style={{background:"transparent",border:"1px solid rgba(255,255,255,0.4)",color:"#fff",padding:"3px 8px",borderRadius:5,fontSize:11,cursor:"pointer"}} onClick={()=>setSessionTech(null)}>↩</button>
        </>}
        {/* Hamburger mobile */}
        {isMobile&&<button onClick={()=>setMenuOuvert(o=>!o)} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",width:36,height:36,borderRadius:8,cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>
          {menuOuvert?"✕":"☰"}
        </button>}
      </div>
    </div>

    {/* ── MENU SANDWICH MOBILE ── */}
    {isMobile&&menuOuvert&&<div style={{position:"sticky",top:52,zIndex:99,background:"#1B4F8A",boxShadow:"0 4px 12px rgba(0,0,0,0.3)"}}>
      {navItems.map(n=>(
        <button key={n.id} onClick={()=>{setPage(n.id);setMenuOuvert(false);}} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:page===n.id?"rgba(255,255,255,0.15)":"transparent",color:"#fff",border:"none",borderBottom:"1px solid rgba(255,255,255,0.1)",padding:"14px 20px",fontSize:15,fontWeight:page===n.id?700:400,cursor:"pointer",textAlign:"left"}}>
          <span>{n.label}</span>
          {n.id==="planning"&&devisCount>0&&<span style={{background:"#E8720C",color:"#fff",borderRadius:10,padding:"2px 8px",fontSize:11,fontWeight:700}}>{devisCount}</span>}
          {n.id==="commandes"&&commandesAlerte>0&&<span style={{background:"#D73A49",color:"#fff",borderRadius:10,padding:"2px 8px",fontSize:11,fontWeight:700}}>{commandesAlerte}</span>}
        </button>
      ))}
      {sessionTech&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",borderTop:"1px solid rgba(255,255,255,0.2)"}}>
        <span style={{color:"#fff",fontSize:13}}>👤 {sessionTech}</span>
        <button onClick={()=>{setSessionTech(null);setMenuOuvert(false);}} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",padding:"5px 12px",borderRadius:6,fontSize:12,cursor:"pointer"}}>↩ Changer</button>
      </div>}
    </div>}

    {demandeIdent&&<ModalIdent techs={techs} onConfirm={confirmIdent}/>}
    {page==="dashboard"&&<PageDashboard fiches={fiches} pieces={pieces} commandesResume={commandesResume} onOuvrirFiche={f=>{setFicheOuverte(f);setPage("fiche");}} onNaviguer={setPage}/>}
    {page==="accueil"&&<PageAccueil fiches={fiches} setFiches={setFiches} categories={categories} onNew={()=>askIdent(t=>{setSessionTech(t);setPage("choix");})} onOpen={f=>{setFicheOuverte(f);setPage("fiche");}} onApercu={f=>{setOuvrirApercu(true);setFicheOuverte(f);setPage("fiche");}} onStatutChange={onStatutChange} onDupliquer={dupliquerFiche}/>}
    {page==="choix"&&<PageChoix onChoisir={m=>{if(m!=="Moteur"&&m!=="Pompe"&&m!=="Moto-réducteur"){alert("Bientôt disponible.");return;}setFicheOuverte(null);setTypeMat(m);setPage("fiche");}} onRetour={()=>setPage("accueil")}/>}
    {page==="fiche"&&<PageFiche ficheInit={ficheOuverte} typeMateriel={ficheOuverte?.type_materiel||typeMat} sessionTech={sessionTech||"—"} techs={techs} clients={clients} onAddClient={onAddClient} categories={categories} onRetour={()=>{setPage("accueil");setFicheOuverte(null);}} onFicheUpdated={onFicheUpdated} ouvrirApercu={ouvrirApercu} onClearApercu={()=>setOuvrirApercu(false)} onOpenRapport={id=>{setRapportFicheId(id);setPage("rapport");}} seedValeurs={seedValeurs} onSeedConsumed={()=>setSeedValeurs(null)}/>}
    {page==="planning"&&<PagePlanning fiches={fiches} onOuvrirFiche={f=>{setFicheOuverte(f);setPage("fiche");}} onStatutChange={onStatutChange}/>}
    {page==="rapport"&&!rapportFicheId&&<PageRapportsListe fiches={fiches} onOpen={f=>setRapportFicheId(f.id)}/>}
    {page==="rapport"&&rapportFicheId&&<PageRapport ficheId={rapportFicheId} techs={techs} onRetour={()=>setRapportFicheId(null)}/>}
    {page==="suivi"&&<PageSuivi/>}
    {page==="chantier"&&<PageChantier fiches={fiches} techs={techs} clients={clients} onAddClient={onAddClient} categories={categories} sessionTech={sessionTech}/>}
    {page==="stockage"&&<PageStockage fiches={fiches} onRetour={()=>setPage("accueil")}/>}
    {page==="commandes"&&<PageCommandes fiches={fiches} onOuvrirFiche={f=>{setFicheOuverte(f);setPage("fiche");}} onResume={setCommandesResume}/>}
    {page==="stats"&&<PageStats fiches={fiches} pieces={pieces}/>}
  </div>);
}
